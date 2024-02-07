import { LayoutConfig, ResolvedLayoutConfig } from "golden-layout";
import { debounce } from "lodash";
import { AppState, Layout, SpecialFolder, db } from "../database";

/*****************************
 * App State
 *****************************/

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
async function getAppState(): Promise<AppState> {
  const defaultState: AppState = {
    _id: "appState",
    dataType: "appState",
    leftMenuSize: 20,
    libraryRightMenuSize: 30,
    selectedFolderId: SpecialFolder.LIBRARY,
    currentItemId: "library",
    openedProjectIds: [],
    theme: "dark",
    fontSize: "16px",
    translateLanguage: "Français (fr)",
    showTranslatedTitle: false,
    citeKeyRule: "author_title_year",
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

const updateAppState = debounce(_updateAppState, 200);

/*****************************
 * Layout
 *****************************/

/**
 * Asynchronously retrieves the layout configuration from the database.
 *
 * @returns {Promise<Layout>} A promise that resolves to a Layout object.
 * The Layout object contains the configuration details for the application layout,
 * including settings for display icons, dimensions, and the root layout structure.
 * The root layout structure defines the type of layout (e.g., 'stack') and the content it includes,
 * such as component type and state.
 *
 * If the layout configuration does not exist in the database or if there's an error during retrieval,
 * the function sets and returns a default layout configuration. The default configuration includes
 * settings like disabled popout and maximise icons, enabled close icon, specific dimensions, and a root
 * layout with predefined content.
 */
async function getLayout(): Promise<Layout> {
  const defaultLayout = {
    _id: "layout",
    dataType: "layout",
    config: {
      settings: {
        showPopoutIcon: false,
        showMaximiseIcon: false,
        // must have close icon otherwise the last tab can't close
        showCloseIcon: true,
      },
      dimensions: {
        borderWidth: 3,
        headerHeight: 36,
        // no need to show ghost image of the content
        dragProxyWidth: 0,
        dragProxyHeight: 0,
      },
      root: {
        type: "stack",
        content: [
          {
            type: "component",
            title: "Library",
            componentType: "LibraryPage",
            componentState: { id: "library" },
          },
        ],
      },
    },
  } as Layout;
  try {
    const layout = (await db.get("layout")) as Layout;
    if (!layout.config.root) return defaultLayout;
    else return layout;
  } catch (error) {
    await db.put(defaultLayout);
    return defaultLayout;
  }
}

/**
 * Asynchronously updates the layout configuration in the database.
 *
 * @param {LayoutConfig | ResolvedLayoutConfig} config - The configuration object for the layout.
 * This object can be either a LayoutConfig or a ResolvedLayoutConfig, containing the layout settings,
 * dimensions, and root layout structure. The configuration details include settings for display icons,
 * dimensions like border width and header height, and the root layout structure specifying the layout type
 * (e.g., 'stack') and its content components.
 *
 * The function retrieves the current layout configuration from the database, updates its configuration with
 * the provided config object, and then saves the updated layout back to the database.
 */
async function _updateLayout(config: LayoutConfig | ResolvedLayoutConfig) {
  let layout: any = await db.get("layout");
  layout.config = config;
  await db.put(layout);
}

const updateLayout = debounce(_updateLayout, 200);

export { getAppState, getLayout, updateAppState, updateLayout };
