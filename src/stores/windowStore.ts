import { WebviewWindow, getCurrent } from "@tauri-apps/api/window";
import { nanoid } from "nanoid";
import { defineStore } from "pinia";
import { Col, Layout, Page, PageType, Row, Stack } from "src/backend/database";
import { getLayout, updateLayout } from "src/backend/layout";
import { toRaw } from "vue";
export const useWindowStore = defineStore("windowStore", {
  state: () => ({
    // layout of each window, the key is windowId
    layouts: new Map<string, Layout>(),
    currentItemId: "library",
    historyItemId: [] as string[],
  }),

  getters: {
    layout: (state) => {
      const window = getCurrent();
      return state.layouts.get(window.label) as Layout;
    },

    windowId: (state) => getCurrent().label,
  },

  actions: {
    /**
     * Load the layout from database, then set the correct currentItemId
     */
    async loadLayout() {
      console.log("windowId = ", this.windowId);
      console.log("loading layout", this.layout);
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

    async saveLayout() {
      if (this.windowId !== "main") return;
      await updateLayout(this.layout);
    },

    /**************************************
     * Window Control
     **************************************/
    openWindow(page: Page) {
      if (this.windowId !== "main") return;
      const windowId = nanoid();
      console.log("create a window ", windowId);
      page.visible = true;
      this.layouts.set(windowId, {
        id: "stack",
        type: "stack",
        children: [page],
      });
      console.log("with layout", this.layout);
      new WebviewWindow(windowId, {
        url: `#/layout/?pageId=${page.id}&pageType=${page.type}&pageLabel=${page.label}`,
      });
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
      if (!this.findPage((p) => p.id === page.id)) {
        // when clicking at the projectTree, the currentItemId will be set the the page.id
        // we need to find the id of previous active page
        const targetId =
          this.currentItemId === page.id
            ? this.historyItemId[this.historyItemId.length - 1]
            : this.currentItemId;
        this.insertPage(page, targetId, "after");
      }
      this.setActive(page.id);
    },

    /**
     * closes a page identified by its itemid. the method removes the page from the store and updates the application state.
     * @param itemid - the unique identifier of the page to be closed.
     */
    closePage(pageId: string) {
      this.removeNode(pageId);
      this.historyItemId = this.historyItemId.filter((id) => id !== pageId);
      if (this.currentItemId === pageId)
        this.currentItemId = this.historyItemId.pop() || "";

      // insert a library page if layout is empty
      if (this.layout.type === "stack" && this.layout.children.length === 0) {
        this.layout.children.push({
          id: "library",
          label: "library",
          type: PageType.LibraryPage,
          visible: true,
        });
        this.setActive("library");
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
     * Set a component active
     * @param id
     */
    setActive(id: string) {
      if (id === this.currentItemId) return;
      if (this.currentItemId) this.historyItemId.push(this.currentItemId);
      this.currentItemId = id;
    },

    /***********************************************
     * Utils
     ***********************************************/
    /**
     * Returns the page with specified id, returns undefined is not found
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
