import { db, AppState, Layout, SpecialFolder } from "../database";
import { LayoutConfig, ResolvedLayoutConfig } from "golden-layout";
import { debounce } from "quasar";

/*****************************
 * App State
 *****************************/

async function getAppState(): Promise<AppState> {
  try {
    return (await db.get("appState")) as AppState;
  } catch (error) {
    // return default app state
    let state: AppState = {
      _id: "appState",
      dataType: "appState",
      ribbonToggledBtnUid: "",
      leftMenuSize: 20,
      showLeftMenu: false,
      showPDFMenuView: false,
      pdfRightMenuSize: 30,
      showPDFRightMenu: false,
      libraryRightMenuSize: 30,
      showLibraryRightMenu: false,
      selectedFolderId: SpecialFolder.LIBRARY,
      currentItemId: "library",
      openedProjectIds: [],
      settings: {
        theme: "dark",
        fontSize: "16px",
        citeKeyRule: "author_title_year",
      },
    };
    return state;
  }
}

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

async function _updateLayout(config: LayoutConfig | ResolvedLayoutConfig) {
  let layout: any = await db.get("layout");
  layout.config = config;
  await db.put(layout);
}

const updateLayout = debounce(_updateLayout, 200);

export { getLayout, updateLayout, getAppState, updateAppState };
