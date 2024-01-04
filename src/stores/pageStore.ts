import { defineStore } from "pinia";
import type { Page } from "src/backend/database";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    pages: new Map<string, Page>(), // {refId: Page}
  }),

  actions: {
    openPage() {},

    closePage() {},

    renamePage() {},
  },
});
