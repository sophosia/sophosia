import { defineStore } from "pinia";
import { Dark } from "quasar";
import { AppState } from "src/backend/database";

export const useSettingStore = defineStore("settingStore", {
  state: () => ({
    initialized: false,
    theme: "dark",
    fontSize: "16px",
    translateLanguage: "Français (fr)",
    showTranslatedTitle: false,
    citeKeyRule: "author_title_year",
  }),

  actions: {
    /**
     * Given the appState, initialize the store
     * @param {AppState} state
     */
    async loadState(state: AppState) {
      if (this.initialized) return;
      this.theme = state.theme;
      this.fontSize = state.fontSize;
      this.translateLanguage = state.translateLanguage;
      this.showTranslatedTitle = state.showTranslatedTitle;
      this.citeKeyRule = state.citeKeyRule;

      this.changeTheme(state.theme);
      this.changeFontSize(parseFloat(state.fontSize));
      this.initialized = true;
    },

    /**
     * Output the data needs to be saved
     * @returns {AppState} The data needs to be saved
     */
    saveState(): AppState {
      return {
        theme: this.theme,
        fontSize: this.fontSize,
        translateLanguage: this.translateLanguage,
        showTranslatedTitle: this.showTranslatedTitle,
        citeKeyRule: this.citeKeyRule,
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
      this.theme = theme;
    },

    changeFontSize(size: number) {
      // ui
      document.documentElement.style.fontSize = `${size}px`;

      // db
      this.fontSize = `${size}px`;
    },

    changeTranslate(language: string) {
      //db
      this.translateLanguage = language;
    },
  },
});
