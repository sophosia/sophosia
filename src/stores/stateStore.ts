import { defineStore } from "pinia";
import { Dark } from "quasar";
import { getAppState, updateAppState } from "src/backend/appState";
import { AppState, Settings, SpecialFolder } from "src/backend/database";
import { useProjectStore } from "./projectStore";

export const useStateStore = defineStore("stateStore", {
  state: () => ({
    ready: false,

    // layout
    ribbonToggledBtnUid: "",
    leftMenuSize: 20,
    showLeftMenu: false,
    showPDFMenuView: false,
    libraryRightMenuSize: 30,
    showLibraryRightMenu: false,
    // showWelcomeCarousel: true,

    // tree view
    selectedFolderId: SpecialFolder.LIBRARY.toString(),

    // projects
    openedProjectIds: new Set<string>(), // for projectTree

    // settings
    settings: {
      theme: "dark",
      fontSize: "16px",
      translateLanguage: "Français (fr)",
      citeKeyRule: "author_title_year",
    } as Settings,

    // page
    currentItemId: "library",
  }),

  actions: {
    async loadState() {
      const state = await getAppState();
      this.leftMenuSize = state.leftMenuSize || this.leftMenuSize;
      this.showLeftMenu = state.showLeftMenu || this.showLeftMenu;
      this.showPDFMenuView = state.showPDFMenuView || this.showPDFMenuView;
      this.libraryRightMenuSize =
        state.libraryRightMenuSize || this.libraryRightMenuSize;
      this.showLibraryRightMenu =
        state.showLibraryRightMenu || this.showLibraryRightMenu;
      this.ribbonToggledBtnUid =
        state.ribbonToggledBtnUid || this.ribbonToggledBtnUid;
      this.selectedFolderId = state.selectedFolderId || this.selectedFolderId;
      this.currentItemId = state.currentItemId || this.currentItemId;
      this.openedProjectIds = new Set(state.openedProjectIds); // convert to Set after loading
      this.settings = Object.assign(this.settings, state.settings); // if state.settings is missing anything, this won't hurt!

      // this.ready = true;
    },

    getState(): AppState {
      return {
        _id: "appState",
        dataType: "appState",
        ribbonToggledBtnUid: this.ribbonToggledBtnUid,
        leftMenuSize: this.leftMenuSize,
        showLeftMenu: this.showLeftMenu,
        showPDFMenuView: this.showPDFMenuView,
        libraryRightMenuSize: this.libraryRightMenuSize,
        showLibraryRightMenu: this.showLibraryRightMenu,
        selectedFolderId: this.selectedFolderId,
        currentItemId: this.currentItemId,
        openedProjectIds: [...this.openedProjectIds] as string[], // convert to Array for saving
        settings: this.settings as Settings,
      } as AppState;
    },

    changeTheme(theme: string) {
      // ui
      switch (theme) {
        case "dark":
          Dark.set(true);
          break;
        case "light":
          Dark.set(false);
          break;
      }

      // db
      this.settings.theme = theme;
      this.saveAppState();
    },

    changeFontSize(size: number) {
      // ui
      document.documentElement.style.fontSize = `${size}px`;

      // db
      this.settings.fontSize = `${size}px`;
      this.saveAppState();
    },

    changeTranslate(language: string) {
      //db
      this.settings.translateLanguage = language;
      this.saveAppState();
    },

    async saveAppState() {
      if (!this.ready) return;
      const projectStore = useProjectStore();
      let state = this.getState();
      state.openedProjectIds = projectStore.openedProjects.map(
        (project) => project._id
      );
      await updateAppState(state);
    },
  },
});
