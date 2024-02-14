import { debounce } from "lodash";
import { Layout, PageType, db } from "../database";
interface LayoutData {
  _id: "layout";
  dataType: "layout";
  layout: Layout;
}

/**
 * Asynchronously retrieves the layout configuration from the database.
 *
 * @returns {Promise<Layout>} A promise that resolves to a Layout object.
 * The Layout object contains the configuration details for the application layout.
 *
 * If the layout configuration does not exist in the database or if there's an error during retrieval,
 * the function sets and returns a default layout configuration. The default configuration includes
 */
export async function getLayout(): Promise<Layout> {
  const defaultLayout = {
    id: "stack",
    type: "stack",
    children: [
      {
        id: "library",
        type: PageType.LibraryPage,
        label: "library",
        visible: true,
      },
    ],
  } as Layout;
  // const defaultLayout = {
  //   id: "stack",
  //   type: "stack",
  //   children: [
  //     {
  //       id: "library",
  //       type: PageType.LibraryPage,
  //       label: "library",
  //       visible: true,
  //     },
  //     {
  //       id: "settings",
  //       type: PageType.SettingsPage,
  //       label: "settings",
  //       visible: false,
  //     },
  //   ],
  // } as Layout;
  // const defaultLayout = {
  //   id: "splitter",
  //   type: "row",
  //   split: 50,
  //   children: [
  //     {
  //       id: "stack",
  //       type: "stack",
  //       children: [
  //         {
  //           id: "library",
  //           type: PageType.LibraryPage,
  //           label: "library",
  //           visible: true,
  //         },
  //       ],
  //     },
  //     {
  //       id: "stack2",
  //       type: "stack",
  //       children: [
  //         {
  //           id: "settings",
  //           type: PageType.SettingsPage,
  //           label: "settings",
  //           visible: false,
  //         },
  //       ],
  //     },
  //   ],
  // } as Layout;
  try {
    const layoutData = (await db.get("layout")) as LayoutData;
    if (!layoutData.layout) return defaultLayout;
    else return layoutData.layout;
  } catch (error) {
    await db.put({
      _id: "layout",
      dataType: "layout",
      layout: defaultLayout,
    } as LayoutData);
    return defaultLayout;
  }
}

/**
 * Asynchronously updates the layout configuration in the database.
 *
 * @param {Layout} layout - The configuration object for the layout.
 *
 * The function retrieves the current layout configuration from the database, updates its configuration with
 * the provided config object, and then saves the updated layout back to the database.
 */
async function _updateLayout(layout: Layout) {
  const layoutData = (await db.get("layout")) as LayoutData;
  layoutData.layout = layout;
  await db.put(layoutData);
}

export const updateLayout = debounce(_updateLayout, 200);
