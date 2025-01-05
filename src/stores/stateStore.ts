import { defineStore } from "pinia";
import { getAppState, updateAppState } from "src/backend/appState";
import { AppState } from "src/backend/database";
import { useAccountStore } from "./accountStore";
import { useLayoutStore } from "./layoutStore";
import { useProjectStore } from "./projectStore";
import { useSettingStore } from "./settingStore";
import { useChatStore } from "./chatStore";

export const useStateStore = defineStore("stateStore", () => {
  /**
   * Load appState from disk and distribute them to every store
   */
  async function loadState() {
    const state = await getAppState();
    const settingStore = useSettingStore();
    const layoutStore = useLayoutStore();
    const projectStore = useProjectStore();
    const accountStore = useAccountStore();
    // const chatStore = useChatStore();
    settingStore.initialized = false; // set to false so the state can be overwrite
    await settingStore.loadState(state);
    layoutStore.initialized = false; // set to false so the state can be overwrite
    await layoutStore.loadState(state);
    projectStore.initialized = false; // set to false so the state can be overwrite
    await projectStore.loadState(state);
    accountStore.initialized = false;
    await accountStore.loadState();
    // chatStore.initialized = false;
    // await chatStore.loadState(state);
  }

  /**
   * Extract necessary data from each store then update appState on disk
   */
  async function updateState() {
    const settingStore = useSettingStore();
    const layoutStore = useLayoutStore();
    const projectStore = useProjectStore();
    // const chatStore = useChatStore();
    if (
      !(
        (
          settingStore.initialized &&
          layoutStore.initialized &&
          projectStore.initialized
        )
        // chatStore.initialized
      )
    )
      return;
    const state = { _id: "appState", dataType: "appState" } as AppState;
    Object.assign(state, settingStore.saveState());
    Object.assign(state, layoutStore.saveState());
    Object.assign(state, projectStore.saveState());
    // Object.assign(state, chatStore.saveState());
    await updateAppState(state);
  }

  return { loadState, updateState };
});
