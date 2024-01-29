import {
  Excalidraw,
  MainMenu,
  serializeAsJSON,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  BinaryFiles,
  ExcalidrawImperativeAPI,
  AppState as ExcalidrawState,
  LibraryItems,
} from "@excalidraw/excalidraw/types/types";
import {
  createDir,
  exists,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { debounce } from "quasar";
import { useEffect, useState } from "react";
import { db } from "src/backend/database";
import { loadNote, saveNote } from "src/backend/project/note";
import "src/css/excalidraw/theme.scss";
import { useSettingStore } from "src/stores/settingStore";

interface InitialData {
  elements: ExcalidrawElement[];
  appState: ExcalidrawState;
  files: BinaryFiles;
  libraryItems: LibraryItems;
}

const settingStore = useSettingStore();

export default function CustomExcalidraw(props: { noteId: string }) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<InitialData>();
  const [ready, setReady] = useState<boolean>(false);

  /**
   * Asynchronously loads Excalidraw data for a given note.
   *
   * This function retrieves the Excalidraw scene data from the backend
   * using the provided note ID. If the note data exists, it parses the JSON
   * string into an `InitialData` object. If the note data doesn't exist,
   * it initializes the Excalidraw scene with the default application theme.
   *
   * @returns {Promise<InitialData>} A promise that resolves to the initial data for Excalidraw.
   */
  async function loadExcalidraw(): Promise<InitialData> {
    const jsonString = await loadNote(props.noteId);
    const scene = jsonString
      ? JSON.parse(jsonString)
      : { appState: { theme: settingStore.theme } };
    return scene as InitialData;
  }

  /**
   * Private function to asynchronously save the current state of Excalidraw elements.
   *
   * This function serializes the current state of Excalidraw elements, app state,
   * and files into a JSON string. It then updates the theme in the app state and
   * saves the JSON string to the backend using the provided note ID. The saving
   * operation is performed only if the component is marked as ready.
   *
   * @param {readonly ExcalidrawElement[]} elements - The Excalidraw elements to be saved.
   * @param {ExcalidrawState} state - The current state of Excalidraw.
   * @param {BinaryFiles} files - Binary files associated with the Excalidraw instance.
   */
  async function _saveExcalidraw(
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) {
    if (!ready) return;
    const jsonString = serializeAsJSON(elements, state, files, "local");
    const json = JSON.parse(jsonString);
    json.appState.theme = state.theme;
    await saveNote(props.noteId, JSON.stringify(json, null, 2));
  }

  const saveExcalidraw = debounce(_saveExcalidraw, 100) as (
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) => void;

  /**
   * Asynchronously loads the Excalidraw library items from a file.
   *
   * This function checks for the existence of a library file in the application's
   * storage path. If the file exists, it reads the file and parses the JSON content
   * into `LibraryItems`. If the file does not exist, it returns an empty array.
   *
   * @returns {Promise<LibraryItems>} A promise that resolves to the library items for Excalidraw.
   */
  async function loadExcalidrawLibrary(): Promise<LibraryItems> {
    let hiddenFolder = await join(
      db.config.storagePath,
      ".sophosia",
      "excalidraw"
    );
    let filePath = await join(hiddenFolder, "library.excalidrawlib");
    if (!(await exists(filePath))) return [] as LibraryItems;
    return JSON.parse(await readTextFile(filePath))
      .libraryItems as LibraryItems;
  }

  /**
   * Asynchronously saves Excalidraw library items to a file.
   *
   * This function serializes the provided library items into a JSON string
   * and saves it to a file in a specified storage path. It creates the directory
   * if it does not exist. The saving operation is only performed if the component
   * is marked as ready.
   *
   * @param {LibraryItems} items - The library items to be saved.
   */
  async function saveExcalidrawLibrary(items: LibraryItems) {
    // do not save anything when loading library
    if (!ready) return;
    try {
      let hiddenFolder = await join(
        db.config.storagePath,
        ".sophosia",
        "excalidraw"
      );
      if (!(await exists(hiddenFolder)))
        await createDir(hiddenFolder, { recursive: true });
      let filePath = await join(hiddenFolder, "library.excalidrawlib");
      let jsonString = serializeLibraryAsJSON(items);
      await writeTextFile(filePath, jsonString);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    const onMounted = async () => {
      const data = await loadExcalidraw();
      if (data) setInitialData(data);

      const items = await loadExcalidrawLibrary();
      if (initialData) initialData.libraryItems = items;

      setReady(true);
    };

    onMounted();
  }, []);

  return ready ? (
    <Excalidraw
      ref={(api: ExcalidrawImperativeAPI) => {
        setExcalidrawAPI(api);
      }}
      initialData={initialData}
      onChange={saveExcalidraw}
      onLibraryChange={saveExcalidrawLibrary}
    >
      <MainMenu>
        <MainMenu.DefaultItems.LoadScene />
        <MainMenu.DefaultItems.ClearCanvas />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
        <MainMenu.Separator />
        <MainMenu.DefaultItems.Help />
      </MainMenu>
    </Excalidraw>
  ) : undefined;
}
