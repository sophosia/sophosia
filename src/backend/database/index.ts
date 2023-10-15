import {
  BaseDirectory,
  createDir,
  exists,
  readDir,
  readTextFile,
  removeFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { nanoid } from "nanoid";

interface Doc extends Object {
  _id: string;
  dataType: string;
}

interface Response {
  id: string;
  success: boolean;
  doc: Doc;
}

export class JsonDB {
  storagePath: string = "";

  async get(id: string): Promise<Doc> {
    if (!this.storagePath) throw Error("storagePath not set");
    for (let folder of [
      "appState",
      "layout",
      "project",
      "note",
      "folder",
      "pdfAnnotation",
      "pdfState",
    ]) {
      let path = await join(
        this.storagePath,
        ".sophosia",
        folder,
        `${id}.json`
      );
      if (await exists(path)) return JSON.parse(await readTextFile(path));
    }
    throw Error(`data with id=${id} not found`);
  }

  async put(doc: Doc) {
    if (!this.storagePath) throw Error("storagePath not set");
    let path = await join(
      this.storagePath,
      ".sophosia",
      doc.dataType,
      `${doc._id}.json`
    );
    await writeTextFile(path, JSON.stringify(doc));
  }

  async post(doc: { dataType: string }) {
    if (!this.storagePath) throw Error("storagePath not set");
    (doc as Doc)._id = nanoid(10);
    await this.put(doc as Doc);
  }

  async remove(doc: Doc) {
    if (!this.storagePath) throw Error("storagePath not set");
    let path = await join(
      this.storagePath,
      ".sophosia",
      doc.dataType,
      `${doc._id}.json`
    );
    await removeFile(path);
  }

  async getDocs(dataType: string): Promise<Doc[]> {
    if (!this.storagePath) throw Error("storagePath not set");
    let dir = await join(this.storagePath, ".sophosia", dataType);
    let files = await readDir(dir);
    let promises = files.map(async (file) => {
      try {
        return JSON.parse(await readTextFile(file.path));
      } catch (error) {
        console.log(error);
      }
    });

    return await Promise.all(promises);
  }

  async bulkDocs(docs: Doc[]) {
    if (!this.storagePath) throw Error("storagePath not set");
    let promises = docs.map(async (doc) => {
      try {
        await this.put(doc);
      } catch (error) {
        console.log(error);
      }
    });

    return await Promise.all(promises);
  }

  async getStoragePath(): Promise<string> {
    try {
      let config = JSON.parse(
        await readTextFile("config.json", { dir: BaseDirectory.AppConfig })
      );
      this.storagePath = config.storagePath;
      return config.storagePath as string;
    } catch (error) {
      console.log(error);
      return "";
    }
  }

  async setStoragePath(path: string) {
    try {
      if (!(await exists(await appConfigDir())))
        await createDir(await appConfigDir());
      await writeTextFile(
        "config.json",
        JSON.stringify({ storagePath: path }),
        { dir: BaseDirectory.AppConfig }
      );
      this.storagePath = path;
    } catch (error) {
      console.log(error);
    }
  }

  async createHiddenFolders() {
    if (!this.storagePath) throw Error("storagePath not set");
    let sophosia = await join(this.storagePath, ".sophosia");
    await createDir(sophosia);
    for (let folder of [
      "appState",
      "layout",
      "project",
      "note",
      "folder",
      "pdfAnnotation",
      "pdfState",
    ])
      await createDir(await join(sophosia, folder));
  }
}

export const db = new JsonDB();
export * from "./models";
