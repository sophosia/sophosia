import { debounce } from "lodash";
import { AppState, SpecialCategory, db } from "../database";

/**
 * Asynchronously retrieves the current state of the application from the database.
 *
 * @returns {Promise<AppState>} A promise that resolves to the AppState object.
 * This object includes various state parameters such as ribbon toggle button UID, menu sizes,
 * visibility flags for different menus, the selected folder ID, the current item ID,
 * opened project IDs, and settings including theme, font size, translate language, and cite key rule.
 *
 * In case of any error during retrieval from the database, the function returns a default AppState object
 * with predefined values for all the state parameters.
 */
export async function getAppState(): Promise<AppState> {
  const defaultState: AppState = {
    _id: "appState",
    dataType: "appState",
    ribbonClickedBtnId: "",
    leftMenuSize: 0,
    libraryRightMenuSize: 0,
    selectedCategory: SpecialCategory.LIBRARY,
    currentItemId: "library",
    historyItemIds: [],
    openedProjectIds: [],
    theme: "dark",
    fontSize: "16px",
    pdfTranslateEngine: "google",
    pdfTranslateApiKey: "",
    pdfTranslateLanguage: "fr",
    showTranslatedTitle: false,
    citeKeyRule: "author_year_title",
    pdfRenameRule: "author_year_fullTitle",
    projectIdRule: "uid",
    chatStates: [],
    chatVisibility: false,
    currentChatState: null,
    chatMessages: {},
    showConfirmUploadDialog: true,
  };
  try {
    const state = (await db.get("appState")) as AppState;
    return Object.assign(defaultState, state);
  } catch (error) {
    // return default app state
    return defaultState;
  }
}

/**
 * Asynchronously updates the application state in the database.
 *
 * @param {AppState} state - The AppState object containing the current state of the application.
 * This object should include various state parameters such as ribbon toggle button UID, menu sizes,
 * visibility flags for different menus, the selected folder ID, the current item ID,
 * opened project IDs, and settings like theme, font size, translate language, and cite key rule.
 *
 * The function attempts to update the application state in the database using the provided AppState object.
 * If an error occurs during the update, it logs the error to the console.
 */
async function _updateAppState(state: AppState) {
  try {
    await db.put(state);
  } catch (error) {
    console.log(error);
  }
}

export const updateAppState = debounce(_updateAppState, 200);
