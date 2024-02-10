import {
  ComponentItemConfig,
  LayoutConfig,
  ResolvedLayoutConfig,
  RowOrColumnItemConfig,
  StackItemConfig,
} from "golden-layout";
import { customAlphabet } from "nanoid";
import { defineStore } from "pinia";
import { getLayout, updateLayout } from "src/backend/appState";
import {
  AppState,
  NoteType,
  db,
  type AnnotationData,
  type GLState,
  type Note,
  type Page,
  type Project,
} from "src/backend/database";
import { getPDF } from "src/backend/project/project";
import { nextTick } from "vue";
import { useProjectStore } from "./projectStore";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    initialized: false,
    // pages
    currentItemId: "library",
    pages: new Map<string, Page>(), // {refId: Page}
    IdToRef: new Map<string, string>(),
    addedPage: {} as Page,
    renamedPage: {} as Page,
    closedItemId: "",

    // toggles and sizes
    ribbonClickedBtnId: "",
    prvRibbonClickedBtnId: "",
    leftMenuSize: 20,
    prvLeftMenuSize: 20,
    libraryRightMenuSize: 30,
    prvLibraryRightMenuSize: 0,
    showWelcomeCarousel: true,
  }),

  actions: {
    /**
     * Given the appState, initialize the layoutStore
     * We will set initialized to true after the layout is loaded
     * @param {AppState} state
     */
    async loadState(state: AppState) {
      if (this.initialized) return;
      this.currentItemId = state.currentItemId;
      this.ribbonClickedBtnId = state.ribbonClickedBtnId;
      this.prvRibbonClickedBtnId = state.ribbonClickedBtnId;
      this.leftMenuSize = state.leftMenuSize;
      this.libraryRightMenuSize = state.libraryRightMenuSize;
    },

    /**
     * Output the data needs to be saved
     * @returns {AppState} The data needs to be saved
     */
    saveState(): AppState {
      return {
        currentItemId: this.currentItemId,
        ribbonClickedBtnId: this.ribbonClickedBtnId,
        leftMenuSize: this.leftMenuSize,
        libraryRightMenuSize: this.libraryRightMenuSize,
      } as AppState;
    },

    /**********************************
     * Page Control
     **********************************/
    /**
     * Opens a page within the application. If the page already exists, it focuses on the page.
     * Otherwise, it adds the page to the store and prepares it for rendering.
     * @param page - The page object to be opened, containing necessary properties like id, label, type, etc.
     */
    openPage(page: Page) {
      if (this.IdToRef.has(page.id)) {
        this.currentItemId = page.id;
        const refId = this.IdToRef.get(page.id as string) as string;
        // update any necessary data
        this.pages.set(refId, page);
      } else {
        const refId = nanoid();
        this.IdToRef.set(page.id, refId);
        this.pages.set(refId, page);
        this.addedPage = page;
      }
    },

    /**
     * Closes a page identified by its itemId. The method removes the page from the store and updates the application state.
     * @param itemId - The unique identifier of the page to be closed.
     */
    closePage(itemId: string) {
      if (!this.IdToRef.has(itemId)) return;
      this.closedItemId = itemId;
    },

    /**
     * Renames a page in the store. This method is used to update the properties of a page, including changing its identifier.
     * @param oldItemId - The original unique identifier of the page.
     * @param newPage - The updated page object with new properties.
     */
    renamePage(oldItemId: string, newPage: Page) {
      if (!this.IdToRef.has(oldItemId)) return;
      const refId = this.IdToRef.get(oldItemId) as string;
      this.pages.set(refId, newPage);
      this.IdToRef.delete(oldItemId);
      this.IdToRef.set(newPage.id, refId);
      this.renamedPage = newPage;
    },

    /**
     * Loads the layout configuration from the backend and initializes pages based on this configuration.
     * It transforms the layout configuration into a usable format for the frontend.
     * @returns The transformed layout configuration suitable for the frontend application.
     */
    async loadLayout() {
      const layout = await getLayout();
      const config = (
        (layout.config as ResolvedLayoutConfig).resolved
          ? LayoutConfig.fromResolved(layout.config as ResolvedLayoutConfig)
          : layout.config
      ) as LayoutConfig;
      if (config.root === undefined) return;
      let contents = [config.root.content] as (
        | RowOrColumnItemConfig[]
        | StackItemConfig[]
        | ComponentItemConfig[]
      )[];

      while (contents.length > 0) {
        const content = contents.shift() as
          | RowOrColumnItemConfig[]
          | StackItemConfig[]
          | ComponentItemConfig[];
        for (let itemConfig of content) {
          if (itemConfig.type == "component") {
            const state = itemConfig.componentState as GLState;
            const page = {
              id: state.id,
              label: state.label || itemConfig.title,
              type: state.type || itemConfig.componentType,
              data: state.data,
            } as Page;
            this.openPage(page);
            await nextTick();
            state.refId = this.IdToRef.get(page.id) as string;
            itemConfig.componentState = state;
          } else if (itemConfig.content.length > 0) {
            contents.push(
              itemConfig.content as
                | RowOrColumnItemConfig[]
                | StackItemConfig[]
                | ComponentItemConfig[]
            );
          }
        }
      }
      return config;
    },

    /**
     * Saves the current layout configuration to the backend. This method captures the current state of the layout
     * and persists it for future sessions.
     * @param config - The layout configuration object representing the current state of the application layout.
     */
    async saveLayout(config: LayoutConfig | ResolvedLayoutConfig) {
      await updateLayout(config);
    },

    /**
     * Open the associated page for an item and then open the associated project
     * @param itemId
     */
    async openItem(itemId: string) {
      if (!itemId) return;
      try {
        // open associated project
        const projectStore = useProjectStore();
        let item: Project | Note | AnnotationData | undefined;
        item = itemId.includes("/")
          ? await projectStore.getNoteFromDB(itemId)
          : await projectStore.getProjectFromDB(itemId);
        try {
          if (!item) item = (await db.get(itemId)) as AnnotationData;
        } catch (error) {
          console.log(error);
          return;
        }
        await projectStore.openProject(item.projectId || itemId);

        // open associated page
        const page = {} as Page;
        if (item.dataType === "project") {
          page.id = itemId;
          page.type = "ReaderPage";
          page.label = item.label;
          // do not open page if there is no pdf
          if (!(await getPDF(itemId))) return;
        } else if (item.dataType === "note") {
          page.id = itemId;
          page.type =
            item.type === NoteType.MARKDOWN ? "NotePage" : "ExcalidrawPage";
          page.label = item.label;
        } else if (item.dataType === "pdfAnnotation") {
          const project = (await db.get(item.projectId)) as Project;
          page.id = project._id;
          page.type = "ReaderPage";
          page.label = project.label;
          page.data = { focusAnnotId: itemId };
        }
        this.openPage(page);
      } catch (error) {
        console.log(error);
      }
    },

    /*****************************************
     * Layout Control
     *****************************************/

    /**
     * Toggle welcome page
     * If visible is given, set the state as it is
     * @param visible
     */
    toggleWelcome(visible?: boolean) {
      if (visible === undefined) {
        this.showWelcomeCarousel = !this.showWelcomeCarousel;
      } else {
        this.showWelcomeCarousel = visible;
      }
    },

    /**
     * Toggle library right menu
     * The size is determined by the minimum size 30 and its previous size
     * If visible is given, set the state as it is
     * @param visible
     */
    toggleLibraryRightMenu(visible?: boolean) {
      if (visible === undefined) {
        const show = this.libraryRightMenuSize > 0;
        this.libraryRightMenuSize = show
          ? 0
          : Math.max(this.prvLibraryRightMenuSize, 30);
      } else {
        this.libraryRightMenuSize = visible
          ? Math.max(this.prvLibraryRightMenuSize, 30)
          : 0;
      }
    },

    /**
     * After releasing the splitter, record the size and if close right menu if it is too small
     * @param size
     */
    resizeLibraryRightMenu(size: number) {
      this.prvLibraryRightMenuSize = size;
      this.libraryRightMenuSize = size < 5 ? 0 : size;
    },

    /**
     * Toggle left menu
     * The size is determined by the minimum size 20 and its previous size
     * If visible is given, set the state as it is
     * @param visible
     */
    toggleLeftMenu(visible?: boolean) {
      const isClickedSameBtn =
        this.ribbonClickedBtnId === this.prvRibbonClickedBtnId;
      if (visible === undefined) {
        if (!isClickedSameBtn) return;
        const show = this.leftMenuSize > 0;
        this.leftMenuSize = show ? 0 : Math.max(this.prvLeftMenuSize, 20);
      } else {
        this.leftMenuSize = visible ? Math.max(this.prvLeftMenuSize, 20) : 0;
      }
    },

    /**
     * After releasing the splitter, record the size and if close left menu if it is too small
     * @param size
     */
    resizeLeftMenu(size: number) {
      this.prvLeftMenuSize = size;
      this.leftMenuSize = size < 10 ? 0 : size;
    },
  },
});
