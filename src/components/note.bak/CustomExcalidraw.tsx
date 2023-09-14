import React, { useState, useEffect } from "react";
import {
  Excalidraw,
  MainMenu,
  serializeAsJSON,
  serializeLibraryAsJSON
} from "@excalidraw/excalidraw";
import "src/css/excalidraw/theme.scss";
import { debounce, uid } from "quasar";
import { useStateStore } from "src/stores/appState";
import { getNote } from "src/backend/project/note";
import { ExcalidrawElement } from "@excalidraw/excalidraw/types/element/types";
import {
  AppState as ExcalidrawState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  LibraryItems
} from "@excalidraw/excalidraw/types/types";
import { Note } from "src/backend/database";
import {
  createDir,
  exists,
  readTextFile,
  writeTextFile
} from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";

interface InitialData {
  elements: ExcalidrawElement[];
  appState: ExcalidrawState;
  files: BinaryFiles;
  libraryItems: LibraryItems;
}

// const fs = window.fs;
// const path = window.path;
const stateStore = useStateStore();

export default function CustomExcalidraw(props: {
  visible: boolean;
  noteId: string;
}) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [notePath, setNotePath] = useState<string>("");
  const [ready, setReady] = useState<boolean>(false);

  async function loadExcalidraw(): Promise<InitialData | undefined> {
    if (!notePath) return;
    try {
      const scene = JSON.parse(await readTextFile(notePath));
      if (!scene.appState.theme)
        scene.appState.theme = stateStore.settings.theme;
      return scene as InitialData;
    } catch (error) {
      console.log(error);
    }
  }

  async function _saveExcalidraw(
    elements: ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) {
    if (!notePath && !ready) return;
    try {
      const jsonString = serializeAsJSON(elements, state, files, "local");
      const json = JSON.parse(jsonString);
      json.appState.theme = state.theme;
      // fs.writeFileSync(notePath, JSON.stringify(json, null, 2));
      await writeTextFile(notePath, JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(error);
    }
  }

  const saveExcalidraw = debounce(_saveExcalidraw, 100) as (
    elements: ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) => void;

  async function loadExcalidrawLibrary(): Promise<LibraryItems> {
    const storagePath = stateStore.settings.storagePath;
    const hiddenFolder = await join(storagePath, ".research-helper");
    const filePath = await join(hiddenFolder, "library.excalidrawlib");
    if (!(await exists(filePath))) return [] as LibraryItems;
    return JSON.parse(await readTextFile(filePath))
      .libraryItems as LibraryItems;
  }

  async function saveExcalidrawLibrary(items: LibraryItems) {
    // do not save anything when loading library
    if (!ready) {
      setTimeout(() => {
        setReady(true);
      }, 500);
      return;
    }
    const storagePath = stateStore.settings.storagePath;
    try {
      const hiddenFolder = await join(storagePath, ".research-helper");
      if (!(await exists(hiddenFolder))) await createDir(hiddenFolder);
      const filePath = await join(hiddenFolder, "library.excalidrawlib");
      const jsonString = serializeLibraryAsJSON(items);
      await writeTextFile(filePath, jsonString);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getNote(props.noteId).then((note: Note | undefined) => {
      if (!note || notePath) return;
      setNotePath(note.path);
    });
  }, [props.noteId]);

  // const initialData = loadExcalidraw();
  // if (initialData) initialData.libraryItems = loadExcalidrawLibrary();
  let initialData: InitialData | undefined;
  async function loadInitialData() {
    initialData = await loadExcalidraw(); // Wait for the promise to resolve
    if (initialData) {
      initialData.libraryItems = await loadExcalidrawLibrary();
      // Now you can work with initialData.libraryItems
    }
  }

  loadInitialData();

  return notePath && props.visible ? (
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
  ) : null;
}
