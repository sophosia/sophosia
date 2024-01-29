import { debounce } from "lodash";
import { defineStore } from "pinia";
import { getAppState, updateAppState } from "src/backend/appState";
import { AppState } from "src/backend/database";
import { reactive, toRaw } from "vue";
import { useLayoutStore } from "./layoutStore";
import { useProjectStore } from "./projectStore";
import { useSettingStore } from "./settingStore";

export const useStateStore = defineStore("stateStore", () => {
  const state = reactive<AppState>({} as AppState);

  /**
   * Load appState from disk and distribute them to every store
   */
  async function loadState() {
    Object.assign(state, await getAppState());
    const settingStore = useSettingStore();
    const layoutStore = useLayoutStore();
    const projectStore = useProjectStore();
    await settingStore.loadState(toRaw(state));
    await layoutStore.loadState(toRaw(state));
    await projectStore.loadState(toRaw(state));
  }

  /**
   * Extract necessary data from each store then update appState on disk
   */
  async function _updateState() {
    const settingStore = useSettingStore();
    const layoutStore = useLayoutStore();
    const projectStore = useProjectStore();
    if (
      !(
        settingStore.initialized &&
        layoutStore.initialized &&
        projectStore.initialized
      )
    )
      return;
    Object.assign(state, settingStore.saveState());
    Object.assign(state, layoutStore.saveState());
    Object.assign(state, projectStore.saveState());
    await updateAppState(state);
  }

  const updateState = debounce(_updateState, 200);

  return { state, loadState, updateState };
});
