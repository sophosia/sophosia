import { defineStore } from "pinia";
import { nanoid } from "nanoid";

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    pages: new Map<
      string,
      {
        id: string;
        data?: { path?: string; focusAnnotId?: string };
      }
    >(),
  }),

  actions: {
    addGLComponent() {},
  },
});
