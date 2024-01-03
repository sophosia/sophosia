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
import { IdToPath } from "src/backend/project/utils";

interface InitialData {
  elements: ExcalidrawElement[];
  appState: ExcalidrawState;
  files: BinaryFiles;
  libraryItems: LibraryItems;
}

const stateStore = useStateStore();

export default function CustomExcalidraw(props: {
  visible: boolean;
  noteId: string;
}) {
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const [notePath, setNotePath] = useState<string>("");
  const [initialData, setInitialData] = useState<InitialData>();
  const [ready, setReady] = useState<boolean>(false);

  async function loadExcalidraw(): Promise<InitialData | undefined> {
    if (!notePath) return;
    try {
      let scene = JSON.parse(await readTextFile(notePath));
      if (!scene.appState.theme)
        scene.appState.theme = stateStore.settings.theme;
      return scene as InitialData;
    } catch (error) {
      console.log(error);
    }
  }

  async function _saveExcalidraw(
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) {
    if (!notePath && !ready) return;
    try {
      let jsonString = serializeAsJSON(elements, state, files, "local");
      let json = JSON.parse(jsonString);
      json.appState.theme = state.theme;
      await writeTextFile(notePath, JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(error);
    }
  }

  const saveExcalidraw = debounce(_saveExcalidraw, 100) as (
    elements: readonly ExcalidrawElement[],
    state: ExcalidrawState,
    files: BinaryFiles
  ) => void;

  async function loadExcalidrawLibrary(): Promise<LibraryItems> {
    let hiddenFolder = await join(db.storagePath, ".sophosia", "excalidraw");
    let filePath = await join(hiddenFolder, "library.excalidrawlib");
    if (!(await exists(filePath))) return [] as LibraryItems;
    return JSON.parse(await readTextFile(filePath))
      .libraryItems as LibraryItems;
  }

  async function saveExcalidrawLibrary(items: LibraryItems) {
    // do not save anything when loading library
    if (!ready) return;
    try {
      let hiddenFolder = await join(db.storagePath, ".sophosia", "excalidraw");
      if (!(await exists(hiddenFolder))) createDir(hiddenFolder, {recursive: true});
      let filePath = await join(hiddenFolder, "library.excalidrawlib");
      let jsonString = serializeLibraryAsJSON(items);
      await writeTextFile(filePath, jsonString);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    setNotePath(IdToPath(props.noteId))
  }, [props.noteId]);

  useEffect(() => {
    loadExcalidraw().then((data: InitialData | undefined) => {
      if (data) setInitialData(data);
    });
  }, [notePath]);

  useEffect(() => {
    loadExcalidrawLibrary().then((items: LibraryItems) => {
      if (initialData) initialData.libraryItems = items;
      setReady(true);
    });
  }, [initialData]);

  return ready && notePath && props.visible ? (
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
