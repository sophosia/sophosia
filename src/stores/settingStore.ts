import { defineStore } from "pinia";
import { Dark } from "quasar";

export const useSettingStore = defineStore("settingStore", {
  state: () => ({
    theme: "dark",
    fontSize: "16px",
    translateLanguage: "Français (fr)",
    citeKeyRule: "author_title_year",
  }),

  actions: {
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
