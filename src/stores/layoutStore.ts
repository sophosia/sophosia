import {
  ComponentItemConfig,
  LayoutConfig,
  ResolvedLayoutConfig,
  RowOrColumnItemConfig,
  StackItemConfig
} from "golden-layout";
import { customAlphabet } from "nanoid";
import { defineStore } from "pinia";
import { getLayout, updateLayout } from "src/backend/appState";
import type { GLState, Page } from "src/backend/database";
import { nextTick } from "vue";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    currentItemId: "library",
    pages: new Map<string, Page>(), // {refId: Page}
    IdToRef: new Map<string, string>(),

    initialized: false,

    addedPage: {} as Page,
    renamedPage: {} as Page,
    closedItemId: ""
  }),

  actions: {
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
              data: state.data
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
    }
  }
});
