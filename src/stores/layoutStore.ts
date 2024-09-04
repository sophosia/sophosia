import { basename } from "@tauri-apps/api/path";
import { WebviewWindow, getCurrent } from "@tauri-apps/api/window";
import { nanoid } from "nanoid";
import { defineStore } from "pinia";
import { NoteType, PageType, db } from "src/backend/database";
import type {
  AnnotationData,
  AppState,
  Col,
  Layout,
  Note,
  Page,
  Project,
  Row,
  Stack,
} from "src/backend/database/models";
import { getLayout, updateLayout } from "src/backend/layout";
import { getPDF, getProject } from "src/backend/project/project";
import { toRaw } from "vue";
import { useProjectStore } from "./projectStore";
import { getDataType } from "src/backend/project/utils";

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    initialized: false,
    // toggles and sizes
    ribbonClickedBtnId: "",
    prvRibbonClickedBtnId: "",
    leftMenuSize: 0,
    prvLeftMenuSize: 0,
    libraryRightMenuSize: 0,
    leftMenuViewId: "projectNavigator",
    prvLibraryRightMenuSize: 0,
    showWelcomeCarousel: true,

    // layout
    currentItemId: "",
    historyItemIds: [] as string[],
    // store layout for each window, the key is windowId
    layouts: new Map<string, Layout>(),
  }),

  getters: {
    windowId: (state) => getCurrent().label,

    layout: (state) => state.layouts.get(getCurrent().label) as Layout,
  },

  actions: {
    /************************************
     * Database
     ************************************/
    /**
     * Given the appState, initialize the layoutStore
     * We will set initialized to true after the layout is loaded
     * @param {AppState} state
     */
    async loadState(state: AppState) {
      if (this.initialized) return;
      this.currentItemId = state.currentItemId;
      this.historyItemIds = state.historyItemIds;
      this.ribbonClickedBtnId = state.ribbonClickedBtnId;
      this.prvRibbonClickedBtnId = state.ribbonClickedBtnId;
      this.leftMenuSize = state.leftMenuSize;
      this.libraryRightMenuSize = state.libraryRightMenuSize;
      // load layout from db
      await this.loadLayout();
      this.initialized = true;
    },

    /**
     * Output the data needs to be saved
     * @returns {AppState} The data needs to be saved
     */
    saveState(): AppState {
      // save layout to db
      this.saveLayout();
      // returns other states to stateStore for saving
      return {
        currentItemId: this.currentItemId,
        historyItemIds: this.historyItemIds,
        ribbonClickedBtnId: this.ribbonClickedBtnId,
        leftMenuSize: this.leftMenuSize,
        libraryRightMenuSize: this.libraryRightMenuSize,
      } as AppState;
    },

    /**
     * Load the layout from database, then set the correct currentItemId
     * Only load layout in main window
     */
    async loadLayout() {
      if (this.windowId !== "main") return;
      this.layouts.set(this.windowId, await getLayout());
      if (this.findPage((page) => page.id === this.currentItemId))
        this.setActive(this.currentItemId);
      else {
        // set the first page to active
        const firstPage = this.findPage((page) => !!page);
        if (firstPage) this.setActive(firstPage.id);
      }
    },

    /**
     * Save the layout to database
     * Only save layout in main window
     */
    async saveLayout() {
      if (this.windowId !== "main") return;
      await updateLayout(this.layout);
    },

    /**********************************
     * Page Control
     **********************************/
    /**
     * Opens a page within the application.
     * If the page does not exist, insert the page in the stack after current page
     * then focuses on the page.
     * @param page - The page object to be opened, containing necessary properties like id, label, type, etc.
     */
    openPage(page: Page) {
      if (this.layout.type === "stack" && this.layout.children.length === 0) {
        this.layout.children.push(page);
      } else if (!this.findPage((p) => p.id === page.id)) {
        // when clicking at the projectTree, the currentItemId will be set the the page.id
        // we need to find the id of previous active page
        const targetId =
          this.currentItemId === page.id
            ? this.historyItemIds[this.historyItemIds.length - 1]
            : this.currentItemId;
        // some projects don't have pdfs hence they have no associated pages
        // need to make sure we find it before we insert page
        const foundPage = this.findPage((p) => p.id === targetId);
        if (foundPage) {
          this.insertPage(page, targetId, "after");
        } else {
          const firstPage = this.findPage((p) => !!p.id);
          this.insertPage(page, firstPage!.id, "after");
        }
      }
      this.setActive(page.id);
    },

    /**
     * closes a page identified by its itemid. the method removes the page from the store and updates the application state.
     * @param itemid - the unique identifier of the page to be closed.
     */
    closePage(pageId: string) {
      this.removeNode(pageId);
      this.historyItemIds = this.historyItemIds.filter((id) => id !== pageId);
      if (this.currentItemId === pageId) {
        if (this.historyItemIds.length > 1)
          this.currentItemId = this.historyItemIds.pop()!;
        else {
          const firstPage = this.findPage((p) => !!p.id);
          this.currentItemId = firstPage?.id || "";
        }
      }

      if (
        this.layout.type === "stack" &&
        this.layout.children.length === 0 &&
        this.windowId !== "main"
      ) {
        // otherwise close the window if the layout is empty
        getCurrent().close();
      }
    },

    /**
     * Renames a page in the store. This method is used to update the properties of a page, including changing its identifier.
     * @param oldItemId - The original unique identifier of the page.
     * @param newPage - The updated page object with new properties.
     */
    renamePage(oldPageId: string, newPage: Page) {
      this.replaceNode(newPage, oldPageId);
    },

    /**
     * Set a component active, save previous active page to history.
     * The history size is 20
     * @param id
     */
    setActive(id: string) {
      if (id === this.currentItemId) return;
      if (this.currentItemId) this.historyItemIds.push(this.currentItemId);
      if (this.historyItemIds.length > 20) this.historyItemIds.shift();
      this.currentItemId = id;
    },

    /**
     * Open the associated page for an item and then open the associated project
     * @param itemId
     */
    async openItem(itemId: string) {
      if (!itemId) return;
      try {
        // open associated project'
        const projectStore = useProjectStore();
        const dataType = getDataType(itemId);
        if (dataType === "project") {
          const item = (await projectStore.getProjectFromDB(itemId)) as Project;
          await projectStore.openProject(item._id);
          const path = await getPDF(itemId);
          if (!path || item.type === "notebook") return; // do not open page if there is no pdf or it's a notebook
          this.openPage({
            id: itemId,
            type: PageType.ReaderPage,
            label: await basename(path),
          });
        } else if (dataType === "note") {
          const item = (await projectStore.getNoteFromDB(itemId)) as Note;
          await projectStore.openProject(item.projectId);
          this.openPage({
            id: itemId,
            type:
              item.type === NoteType.MARKDOWN
                ? PageType.NotePage
                : PageType.ExcalidrawPage,
            label: item.label,
          });
        } else if (dataType === "pdfAnnotation") {
          const item = (await db.get(itemId)) as AnnotationData;
          await projectStore.openProject(item.projectId);
          const project = (await getProject(item.projectId)) as Project;
          this.openPage({
            id: project._id,
            type: PageType.ReaderPage,
            label: project.label,
            data: { focusAnnotId: itemId },
          });
        }
      } catch (error) {
        console.log(error);
      }
    },

    /**************************************
     * Window Control
     **************************************/

    /**
     * Open another Tauri window for the page, and close the page in the mainWindow
     * Only enable this function in main window
     * @param page - page to be opened in another window
     * @returns
     */
    showInNewWindow(page: Page) {
      const windowId = nanoid();
      new WebviewWindow(windowId, {
        url: `#/layout/?pageId=${page.id}&pageType=${page.type}&pageLabel=${page.label}`,
      });
      this.closePage(page.id);
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
        const show = this.leftMenuSize > 0;
        if (!isClickedSameBtn && show) return;
        this.leftMenuSize = show ? 0 : Math.max(this.prvLeftMenuSize, 20);
      } else {
        this.leftMenuSize = visible ? Math.max(this.prvLeftMenuSize, 20) : 0;
      }
    },

    setLeftMenuView(viewId: string) {
      this.leftMenuViewId = viewId;
    },

    /**
     * After releasing the splitter, record the size and if close left menu if it is too small
     * @param size
     */
    resizeLeftMenu(size: number) {
      this.prvLeftMenuSize = size;
      this.leftMenuSize = size < 10 ? 0 : size;
    },

    /***********************************************
     * Utils
     ***********************************************/
    /**
     * Returns the first found page satisfying the predicate, returns undefined is not found
     * @param pageId - the id of the page to search
     * @returns page - the found node, could be undefined
     */
    findPage(predicate: (page: Page) => boolean): Page | undefined {
      if (!this.layout) return undefined;
      const stack = [this.layout];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current.type === "stack") {
          for (const page of current.children) if (predicate(page)) return page;
        } else {
          stack.push(...(current.children as Layout[]));
        }
      }
      return undefined;
    },

    /**
     * Insert a page to position relative to the target page
     * @param page - node to be inserted
     * @param targetPageId - the id of the target node
     * @param pos - position relative to target node, either before or after
     */
    insertPage(page: Page, targetPageId: string, pos: "before" | "after") {
      if (!this.layout) return;
      const stack = [this.layout];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (current.type === "stack") {
          const index = current.children.findIndex(
            (child) => child.id === targetPageId
          );
          if (index > -1) {
            const idx = pos === "after" ? index + 1 : index;
            current.children.splice(idx, 0, page);
          }
        } else {
          stack.push(...(current.children as Layout[]));
        }
      }
    },

    /**
     * Remove a node from a tree, then traverse the tree in post-order
     * and remove the following tree nodes
     * 1. stacks with 0 components
     * 2. rows and cols with only 1 child and only keep their child
     *
     * Example:
     * original tree (where p1,p2,p3 are pages)
     * row
     *  stack [p1]
     *  col
     *    stack [p2]
     *    stack [p3]
     *
     * tree after removing page p1, removePage(p1)
     * col
     *  stack [p2]
     *  stack [p3]
     * @param id - id of node to be removed
     */
    removeNode(id: string) {
      if (!this.layout) return;
      const stack = [this.layout];
      let prvNodeId = "";
      const maxIter = 10;
      let iter = 0;
      while (stack.length > 0 && iter < maxIter) {
        iter++;
        let current = stack[stack.length - 1];
        if (
          current.type !== "stack" &&
          current.children[0].id !== prvNodeId &&
          current.children[1].id !== prvNodeId
        ) {
          stack.push(...(current.children as Layout[]));
        } else {
          if (current.type === "stack") {
            current.children = current.children.filter(
              (page) => page.id !== id
            );
          } else {
            current.children = current.children.filter(
              (child) => child.children.length > 0
            );

            // replace the current node with its child
            if (current.children.length === 1)
              Object.assign(current, current.children[0]);
          }
          // pop the node from stack after processed
          prvNodeId = stack.pop()!.id;
        }
      }
    },

    /**
     * Replace a node with id
     * @param node - the node to be inserted
     * @param targetId - the id of the target node being replaced
     */
    replaceNode(node: Layout | Page, targetId: string) {
      if (!this.layout) return;
      const stack = [this.layout];
      while (stack.length > 0) {
        const current = stack.pop()!;
        // If the current node matches the target node ID, replace it
        if (current.id === targetId) {
          Object.assign(current, node);
          return;
        }
        if (
          current.type === "col" ||
          current.type === "row" ||
          current.type === "stack"
        )
          stack.push(...(current.children as Layout[]));
      }
    },

    /**
     * Create a stack then wrapped the page into it
     * using wrappedInStack(page1, page2)
     * returns {id: uid, type: "stack", children:[page1, page2]}
     * @param page - page to be wrapped
     */
    wrappedInStack(...pages: Page[]) {
      return {
        id: nanoid(),
        type: "stack",
        children: pages.map((page) => toRaw(page)),
      } as Stack;
    },

    /**
     * Create a col then wrapped the nodes into it
     * using wrappedInCol(node1, node2)
     * returns {id: uid, type: "col", children:[node1, node2]}
     * @param nodes - nodes to be wrapped
     */
    wrappedInCol(...nodes: Layout[]) {
      const nodeList = nodes.map((node) =>
        Object.assign({ ...toRaw(node) }, { id: nanoid() })
      );
      return {
        id: nanoid(),
        type: "col",
        split: 50,
        children: nodeList,
      } as Col;
    },

    /**
     * Create a row then wrapped the nodes into it
     * using wrappedInRow(node1, node2)
     * returns {id: uid, type: "row", children:[node1, node2]}
     * @param nodes - nodes to be wrapped
     */
    wrappedInRow(...nodes: Layout[]) {
      const nodeList = nodes.map((node) =>
        Object.assign({ ...toRaw(node) }, { id: nanoid() })
      );
      return {
        id: nanoid(),
        type: "row",
        split: 50,
        children: nodeList,
      } as Row;
    },
  },
});
