import { defineStore } from "pinia";
import { Dark } from "quasar";
import { updateAppState, getAppState } from "src/backend/appState";
import {
  AppState,
  NoteType,
  Page,
  Settings,
  SpecialFolder
} from "src/backend/database";
import { useLayoutStore } from "./layoutStore";
import { useProjectStore } from "./projectStore";
import { getPDF } from "src/backend/project/project";
import { db, Project, Note, AnnotationData } from "src/backend/database";

export const useStateStore = defineStore("stateStore", {
  state: () => ({
    ready: false,

    // layout
    ribbonToggledBtnUid: "",
    leftMenuSize: 20,
    showLeftMenu: false,
    showPDFMenuView: false,
    libraryRightMenuSize: 30,
    showLibraryRightMenu: false,
    showWelcomeCarousel: true,

    // tree view
    selectedFolderId: SpecialFolder.LIBRARY.toString(),

    // projects
    openedProjectIds: new Set<string>(), // for projectTree

    // settings
    settings: {
      theme: "dark",
      fontSize: "16px",
      translateLanguage: "Français (fr)",
      citeKeyRule: "author_title_year"
    } as Settings,

    // page
    openedPage: { id: "", type: "", label: "" },
    closedItemId: "",
    currentItemId: "library"
  }),

  actions: {
    async loadState() {
      const state = await getAppState();
      this.leftMenuSize = state.leftMenuSize || this.leftMenuSize;
      this.showLeftMenu = state.showLeftMenu || this.showLeftMenu;
      this.showPDFMenuView = state.showPDFMenuView || this.showPDFMenuView;
      this.libraryRightMenuSize =
        state.libraryRightMenuSize || this.libraryRightMenuSize;
      this.showLibraryRightMenu =
        state.showLibraryRightMenu || this.showLibraryRightMenu;
      this.ribbonToggledBtnUid =
        state.ribbonToggledBtnUid || this.ribbonToggledBtnUid;
      this.selectedFolderId = state.selectedFolderId || this.selectedFolderId;
      this.currentItemId = state.currentItemId || this.currentItemId;
      this.openedProjectIds = new Set(state.openedProjectIds); // convert to Set after loading
      this.settings = Object.assign(this.settings, state.settings); // if state.settings is missing anything, this won't hurt!

      // this.ready = true;
    },

    getState(): AppState {
      return {
        _id: "appState",
        dataType: "appState",
        ribbonToggledBtnUid: this.ribbonToggledBtnUid,
        leftMenuSize: this.leftMenuSize,
        showLeftMenu: this.showLeftMenu,
        showPDFMenuView: this.showPDFMenuView,
        libraryRightMenuSize: this.libraryRightMenuSize,
        showLibraryRightMenu: this.showLibraryRightMenu,
        selectedFolderId: this.selectedFolderId,
        currentItemId: this.currentItemId,
        openedProjectIds: [...this.openedProjectIds] as string[], // convert to Array for saving
        settings: this.settings as Settings
      } as AppState;
    },

    /**
     * Layout Control
     */

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
        const layoutStore = useLayoutStore();
        layoutStore.openPage(page);
      } catch (error) {
        console.log(error);
      }
    },

    toggleWelcome(visible?: boolean) {
      if (visible === undefined) {
        this.showWelcomeCarousel = !this.showWelcomeCarousel;
      } else {
        this.showWelcomeCarousel = visible;
      }
    },

    /**
     * Toggle left menu
     * If visible is given, set the state as it is
     * @param visible
     */
    toggleLeftMenu(visible?: boolean) {
      if (visible === undefined) {
        this.showLeftMenu = !this.showLeftMenu;
      } else {
        this.showLeftMenu = visible;
      }
    },

    /**
     * Toggle pdf floating menu
     * If visible is given, set the state as it is
     * @param visible
     */
    togglePDFMenuView(visible?: boolean) {
      if (visible === undefined) {
        this.showPDFMenuView = !this.showPDFMenuView;
      } else {
        this.showPDFMenuView = visible;
      }
    },

    changeTheme(theme: string) {
      // ui
      switch (theme) {
        case "dark":
          Dark.set(true);
          break;
        case "light":
          Dark.set(false);
          break;
      }

      // db
      this.settings.theme = theme;
      this.saveAppState();
    },

    changeFontSize(size: number) {
      // ui
      document.documentElement.style.fontSize = `${size}px`;

      // db
      this.settings.fontSize = `${size}px`;
      this.saveAppState();
    },

    changeTranslate(language: string) {
      //db
      this.settings.translateLanguage = language;
      this.saveAppState();
    },

    async saveAppState() {
      if (!this.ready) return;
      const projectStore = useProjectStore();
      let state = this.getState();
      state.openedProjectIds = projectStore.openedProjects.map(
        (project) => project._id
      );
      await updateAppState(state);
    }
  }
});
