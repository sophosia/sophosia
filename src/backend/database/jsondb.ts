import { reactive } from "vue";
import {
  BaseDirectory,
  createDir,
  exists,
  readDir,
  readTextFile,
  removeFile,
  renameFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { appConfigDir, join } from "@tauri-apps/api/path";
import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);
import type { Config } from "./models";

interface Doc extends Object {
  _id: string;
  dataType: string;
}

export class JsonDB {
  config = reactive<Config>({
    storagePath: "",
    language: "en_US",
    lastScanTime: 0,
    storagePaths: [],
  });

  /**
   * Generate a length-8 id with alphabets 0-9A-Z
   */
  get nanoid() {
    return nanoid();
  }

  async get(id: string): Promise<Doc> {
    if (!this.config.storagePath) throw Error("storagePath not set");
    const code2Folder = {
      SP: "project",
      SA: "pdfAnnotation",
      SS: "pdfState",
      SF: "folder",
    };
    let path = "";
    if (id.slice(0, 2) in code2Folder)
      path = await join(
        this.config.storagePath,
        ".sophosia",
        code2Folder[id.slice(0, 2) as "SP" | "SA" | "SS" | "SF"],
        `${id}.json`
      );
    else
      path = await join(this.config.storagePath, ".sophosia", id, `${id}.json`);
    if (await exists(path)) return JSON.parse(await readTextFile(path));
    throw Error(`data with id=${id} not found`);
  }

  async put(doc: Doc) {
    if (!this.config.storagePath) throw Error("storagePath not set");
    let path = await join(
      this.config.storagePath,
      ".sophosia",
      doc.dataType,
      `${doc._id}.json`
    );
    await writeTextFile(path, JSON.stringify(doc));
  }

  async post(doc: { dataType: string }) {
    if (!this.config.storagePath) throw Error("storagePath not set");
    (doc as Doc)._id = nanoid(10);
    await this.put(doc as Doc);
  }

  async remove(doc: Doc) {
    if (!this.config.storagePath) throw Error("storagePath not set");
    let path = await join(
      this.config.storagePath,
      ".sophosia",
      doc.dataType,
      `${doc._id}.json`
    );
    await removeFile(path);
  }

  async getDocs(dataType: string): Promise<Doc[]> {
    if (!this.config.storagePath) throw Error("storagePath not set");
    let dir = await join(this.config.storagePath, ".sophosia", dataType);
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
    if (!this.config.storagePath) throw Error("storagePath not set");
    let promises = docs.map(async (doc) => {
      try {
        await this.put(doc);
      } catch (error) {
        console.log(error);
      }
    });

    return await Promise.all(promises);
  }

  async getConfig() {
    try {
      let config = JSON.parse(
        await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
      );
      this.config.storagePath = config.storagePath;
      this.config.language = config.language || "en_US";
      this.config.lastScanTime = config.lastScanTime || 0;
      this.config.storagePaths = config.storagePaths || [
        this.config.storagePath,
      ];
    } catch (error) {
      console.log(error);
    }
  }

  async setConfig(config: Config) {
    try {
      if (!(await exists(await appConfigDir())))
        await createDir(await appConfigDir());
      // we need to assign variable even if it is "", unless it's undefined
      if (config.language !== undefined) this.config.language = config.language;
      if (config.storagePath !== undefined) {
        this.config.storagePath = config.storagePath;
        if (!this.config.storagePaths.includes(config.storagePath))
          this.config.storagePaths.push(config.storagePath);
      }
      if (config.lastScanTime !== undefined)
        this.config.lastScanTime = config.lastScanTime;
      if (config.storagePaths) this.config.storagePaths = config.storagePaths;

      await writeTextFile("workspace.json", JSON.stringify(this.config), {
        dir: BaseDirectory.AppConfig,
      });
    } catch (error) {
      console.log(error);
    }
  }

  async createHiddenFolders() {
    if (!this.config.storagePath) throw Error("storagePath not set");
    try {
      let sophosia = await join(this.config.storagePath, ".sophosia");
      if (!(await exists(sophosia))) await createDir(sophosia);
      for (let folder of [
        "appState",
        "layout",
        "project",
        "folder",
        "pdfAnnotation",
        "pdfState",
        "image",
      ]) {
        const folderPath = await join(sophosia, folder);
        if (!(await exists(folderPath))) await createDir(folderPath);
      }
    } catch (error) {
      // the folders might exists already
      console.log(error);
    }
  }
}

export const db = new JsonDB();
