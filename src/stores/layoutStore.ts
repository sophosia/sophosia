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
import { getPDF } from "src/backend/project/project";
import { toRaw } from "vue";
import { useProjectStore } from "./projectStore";

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    initialized: false,
    // toggles and sizes
    ribbonClickedBtnId: "",
    prvRibbonClickedBtnId: "",
    leftMenuSize: 20,
    prvLeftMenuSize: 20,
    libraryRightMenuSize: 30,
    prvLibraryRightMenuSize: 0,
    showWelcomeCarousel: true,

    // layout
    currentItemId: "",
    historyItemId: [] as string[],
    layout: {} as Layout,
  }),

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
      this.ribbonClickedBtnId = state.ribbonClickedBtnId;
      this.prvRibbonClickedBtnId = state.ribbonClickedBtnId;
      this.leftMenuSize = state.leftMenuSize;
      this.libraryRightMenuSize = state.libraryRightMenuSize;
      // load layout from db
      this.layout = await getLayout();
      this.setActive(state.currentItemId);
      this.initialized = true;
    },

    /**
     * Output the data needs to be saved
     * @returns {AppState} The data needs to be saved
     */
    saveState(): AppState {
      // save layout to db
      updateLayout(this.layout);
      // returns other states to stateStore for saving
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
     * Opens a page within the application.
     * If the page does not exist, insert the page in the stack after current page
     * then focuses on the page.
     * @param page - The page object to be opened, containing necessary properties like id, label, type, etc.
     */
    openPage(page: Page) {
      if (!this.isNodeExist(page.id)) {
        // when clicking at the projectTree, the currentItemId will be set the the page.id
        // we need to find the id of previous active page
        const targetId =
          this.currentItemId === page.id
            ? this.historyItemId[this.historyItemId.length - 1]
            : this.currentItemId;
        this.insertNode(page, targetId, "after");
      }
      this.setActive(page.id);
    },

    /**
     * closes a page identified by its itemid. the method removes the page from the store and updates the application state.
     * @param itemid - the unique identifier of the page to be closed.
     */
    closePage(pageId: string) {
      console.log("remove", pageId);
      this.removeNode(pageId);
      this.historyItemId = this.historyItemId.filter((id) => id !== pageId);
      if (this.currentItemId === pageId)
        this.currentItemId = this.historyItemId.pop() || "";
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
     * Set a component active
     * @param id
     */
    setActive(id: string) {
      if (id === this.currentItemId) return;
      if (this.currentItemId) this.historyItemId.push(this.currentItemId);
      this.currentItemId = id;
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
          page.type = PageType.ReaderPage;
          page.label = item.label;
          // do not open page if there is no pdf
          if (!(await getPDF(itemId))) return;
        } else if (item.dataType === "note") {
          page.id = itemId;
          page.type =
            item.type === NoteType.MARKDOWN
              ? PageType.NoteNote
              : PageType.ExcalidrawPage;
          page.label = item.label;
        } else if (item.dataType === "pdfAnnotation") {
          const project = (await db.get(item.projectId)) as Project;
          page.id = project._id;
          page.type = PageType.ReaderPage;
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

    /***********************************************
     * Utils
     ***********************************************/

    /**
     * Returns a boolean value to indicate if a node exists
     * @param nodeId - the node to search
     * @returns isExist - boolean value
     */
    isNodeExist(nodeId: string) {
      function _isNodeExist(tree: Layout, nodeId: string, match: boolean[]) {
        match.push(tree.id === nodeId);
        if (
          tree.type === "row" ||
          tree.type === "col" ||
          tree.type === "stack"
        ) {
          tree.children.forEach((child) => _isNodeExist(child, nodeId, match));
        }
      }
      const match = [] as boolean[];
      _isNodeExist(this.layout, nodeId, match);
      return match.some((truth) => truth);
    },

    /**
     * Insert node to pos relative to the node with id
     * @param node - node to be inserted
     * @param id - the id of the target node
     * @param pos - position relative to target node, either before or after
     */
    insertNode(node: Layout, id: string, pos: "before" | "after") {
      function _insertNode(
        tree: Layout,
        node: Layout,
        id: string,
        pos: "before" | "after"
      ) {
        if (
          tree.type === "row" ||
          tree.type === "col" ||
          tree.type === "stack"
        ) {
          const index = tree.children.findIndex((target) => target.id === id);
          if (index !== undefined && index > -1) {
            const idx = pos === "after" ? index + 1 : index;
            tree.children.splice(idx, 0, node);
            return;
          } else {
            tree.children.forEach((child) => _insertNode(child, node, id, pos));
          }
        }
      }
      _insertNode(this.layout, node, id, pos);
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
      function _removeNode(tree: Layout, id: string) {
        if (
          tree.type === "row" ||
          tree.type === "col" ||
          tree.type === "stack"
        ) {
          const children = tree.children;
          const newChilren = [] as (Layout | null)[];
          children.forEach((child) => newChilren.push(_removeNode(child, id)));
          tree.children = newChilren.filter(
            (tree) => !(tree as Layout & { deleted: boolean }).deleted
          ) as Layout[];
        }
        if (
          tree.type === "stack" &&
          tree.children.filter((child) => child).length === 0
        ) {
          (tree as Layout & { deleted: boolean }).deleted = true;
          return tree;
        } else if (
          (tree.type === "row" || tree.type === "col") &&
          tree.children.filter((child) => child).length === 1
        ) {
          return tree.children[0];
          // } else if (tree.type === "page" && tree.id === id) {
        } else if (tree.id === id) {
          // tree.type === PageType
          (tree as Layout & { deleted: boolean }).deleted = true;
          return tree;
        } else {
          return tree;
        }
      }

      this.layout = _removeNode(this.layout, id);
    },

    /**
     * Replace a node with id
     * @param node - the node being insert
     * @param id - the id of the target node being replaced
     */
    replaceNode(node: Layout, id: string) {
      function _replaceNode(tree: Layout, node: Layout, id: string) {
        if (tree.id === id) {
          tree.id = node.id;
          tree.type = node.type;
          if (node.type === "col" || node.type === "row") {
            (tree as Col | Row).split = node.split;
            (tree as Col | Row).children = node.children;
          } else if (node.type === "stack") {
            (tree as Stack).children = node.children;
          } else {
            // page
            (tree as Page).label = node.label;
            (tree as Page).visible = node.visible;
            (tree as Page).data = node.data;
          }
        } else if (
          tree.type === "row" ||
          tree.type === "col" ||
          tree.type === "stack"
        ) {
          tree.children.forEach((child) => _replaceNode(child, node, id));
        }
      }
      _replaceNode(this.layout, node, id);
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
