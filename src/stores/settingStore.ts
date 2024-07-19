import { defineStore } from "pinia";
import { Dark } from "quasar";
import { AppState } from "src/backend/database";

export const useSettingStore = defineStore("settingStore", {
  state: () => ({
    initialized: false,
    theme: "dark",
    fontSize: "16px",
    pdfTranslateEngine: "google",
    pdfTranslateApiKey: "",
    pdfTranslateLanguage: "fr",
    showTranslatedTitle: false,
    citeKeyRule: "author_year_title",
    pdfRenameRule: "author_year_fullTitle",
    projectIdRule: "uid",
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
      this.pdfTranslateEngine = state.pdfTranslateEngine;
      this.pdfTranslateApiKey = state.pdfTranslateApiKey;
      this.pdfTranslateLanguage = state.pdfTranslateLanguage;
      this.showTranslatedTitle = state.showTranslatedTitle;
      this.citeKeyRule = state.citeKeyRule;
      this.pdfRenameRule = state.pdfRenameRule;
      this.projectIdRule = state.projectIdRule;

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
        pdfTranslateEngine: this.pdfTranslateEngine,
        pdfTranslateApiKey: this.pdfTranslateApiKey,
        pdfTranslateLanguage: this.pdfTranslateLanguage,
        showTranslatedTitle: this.showTranslatedTitle,
        citeKeyRule: this.citeKeyRule,
        pdfRenameRule: this.pdfRenameRule,
        projectIdRule: this.projectIdRule,
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
  },
});
