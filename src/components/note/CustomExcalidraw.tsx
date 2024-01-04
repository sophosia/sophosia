import React, { useState, useEffect } from "react";
import {
  Excalidraw,
  MainMenu,
  serializeAsJSON,
  serializeLibraryAsJSON,
} from "@excalidraw/excalidraw";
import "src/css/excalidraw/theme.scss";
import { debounce } from "quasar";
import { useStateStore } from "src/stores/appState";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  AppState as ExcalidrawState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  LibraryItems,
} from "@excalidraw/excalidraw/types/types";
import { db } from "src/backend/database";
import { join } from "@tauri-apps/api/path";
import {
  readTextFile,
  writeTextFile,
  exists,
  createDir,
} from "@tauri-apps/api/fs";
import { loadNote, saveNote } from "src/backend/project/note";

interface InitialData {
  elements: ExcalidrawElement[];
  appState: ExcalidrawState;
  files: BinaryFiles;
  libraryItems: LibraryItems;
}

const stateStore = useStateStore();

export default function CustomExcalidraw(props: {
  noteId: string;
}) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [initialData, setInitialData] = useState<InitialData>();
  const [ready, setReady] = useState<boolean>(false);

  async function loadExcalidraw(): Promise<InitialData> {
    const jsonString = await loadNote(props.noteId)
    const scene = jsonString ? JSON.parse(jsonString) : {appState: {theme: stateStore.settings.theme}}
    return scene as InitialData;
  }

  async function _saveExcalidraw(
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) {
    if (!ready) return;
    const jsonString = serializeAsJSON(elements, state, files, "local");
    const json = JSON.parse(jsonString);
    json.appState.theme = state.theme;
    await saveNote(props.noteId, JSON.stringify(json, null, 2))
  }

  const saveExcalidraw = debounce(_saveExcalidraw, 100) as (
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) => void;

  async function loadExcalidrawLibrary(): Promise<LibraryItems> {
    let hiddenFolder = await join(db.config.storagePath, ".sophosia", "excalidraw");
    let filePath = await join(hiddenFolder, "library.excalidrawlib");
    if (!(await exists(filePath))) return [] as LibraryItems;
    return JSON.parse(await readTextFile(filePath))
      .libraryItems as LibraryItems;
  }

  async function saveExcalidrawLibrary(items: LibraryItems) {
    // do not save anything when loading library
    if (!ready) return;
    try {
      let hiddenFolder = await join(db.config.storagePath, ".sophosia", "excalidraw");
      if (!(await exists(hiddenFolder))) await createDir(hiddenFolder, {recursive: true});
      let filePath = await join(hiddenFolder, "library.excalidrawlib");
      let jsonString = serializeLibraryAsJSON(items);
      await writeTextFile(filePath, jsonString);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    const onMounted = async () => {
      const data = await loadExcalidraw()
      if (data) setInitialData(data);
  
      const items = await loadExcalidrawLibrary()
      if (initialData) initialData.libraryItems = items;

      setReady(true);
    }

    onMounted()
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
