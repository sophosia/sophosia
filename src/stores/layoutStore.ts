import { defineStore } from "pinia";

export const useLayoutStore = defineStore("layoutStore", {
  state: () => ({
    AllComponents: new Map<
      number,
      {
        asyncComponent: any;
        id: string;
        visible?: boolean;
        data?: { path?: string; focusAnnotId?: string };
      }
    >(),
  }),

  actions: {
    addGLComponent() {},
  },
});
