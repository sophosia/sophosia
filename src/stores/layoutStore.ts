import { defineStore } from "pinia";
import type { GLState, Page } from "src/backend/database";
import { getLayout, updateLayout } from "src/backend/appState";
import { customAlphabet } from "nanoid";
import {
  ComponentItemConfig,
  LayoutConfig,
  ResolvedLayoutConfig,
  RowOrColumnItemConfig,
  StackItemConfig,
} from "golden-layout";
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
    closedItemId: "",
  }),

  actions: {
    /**
     * Open a page
     * Focus on the page if the it exists
     * @param page
     */
    openPage(page: Page) {
      if (this.IdToRef.has(page.id)) this.currentItemId = page.id;
      else {
        const refId = nanoid();
        this.IdToRef.set(page.id, refId);
        this.pages.set(refId, page);
        this.addedPage = page;
      }
    },

    /**
     * Remove a page by itemId
     * Removal of the Ids will be handled in unbindComponentEventListener
     * @param itemId
     */
    closePage(itemId: string) {
      if (!this.IdToRef.has(itemId)) return;
      this.closedItemId = itemId;
    },

    /**
     * Update a page by its oldItemId
     * @param oldItemId
     * @param newPage
     */
    renamePage(oldItemId: string, newPage: Page) {
      if (!this.IdToRef.has(oldItemId)) return;
      const refId = this.IdToRef.get(oldItemId) as string;
      this.pages.set(refId, newPage);
      this.IdToRef.delete(oldItemId);
      this.IdToRef.set(newPage.id, refId);
      this.renamedPage = newPage;
    },

    // load layout
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

    // save layout
    async saveLayout(config: LayoutConfig | ResolvedLayoutConfig) {
      await updateLayout(config);
    },
  },
});
