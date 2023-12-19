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

interface Doc extends Object {
  _id: string;
  dataType: string;
}

export class JsonDB {
  storagePath: string = "";

  /**
   * Generate a length-8 id with alphabets 0-9A-Z
   */
  get nanoid() {
    return nanoid();
  }

  async get(id: string): Promise<Doc> {
    if (!this.storagePath) throw Error("storagePath not set");
    const code2Folder = {
      SP: "project",
      SA: "pdfAnnotation",
      SS: "pdfState",
      SF: "folder",
    };
    let path = "";
    if (id.slice(0, 2) in code2Folder)
      path = await join(
        this.storagePath,
        ".sophosia",
        code2Folder[id.slice(0, 2) as "SP" | "SA" | "SS" | "SF"],
        `${id}.json`
      );
    else path = await join(this.storagePath, ".sophosia", id, `${id}.json`);
    if (await exists(path)) return JSON.parse(await readTextFile(path));
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
        await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
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
      let config = {} as {
        storagePath: string;
        lastScanTime: number;
        storagePaths: string[];
      };
      if (await exists(await join(await appConfigDir(), "workspace.json"))) {
        config = JSON.parse(
          await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
        );
        config.storagePath = path;
        if (!config.storagePaths) config.storagePaths = [];
        if (!config.storagePaths.includes(path)) config.storagePaths.push(path);
      } else {
        config = {
          storagePath: path,
          lastScanTime: 0,
          storagePaths: [path],
        };
      }

      await writeTextFile("workspace.json", JSON.stringify(config), {
        dir: BaseDirectory.AppConfig,
      });
      this.storagePath = path;
    } catch (error) {
      console.log(error);
    }
  }

  async createHiddenFolders() {
    if (!this.storagePath) throw Error("storagePath not set");
    try {
      let sophosia = await join(this.storagePath, ".sophosia");
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

  /**
   * Get all workspaces
   */
  async getStoragePaths(): Promise<string[]> {
    try {
      const config = JSON.parse(
        await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
      );
      const storagePaths = config.storagePaths || [];
      if (storagePaths.length === 0 && config.storagePath)
        storagePaths.push(config.storagePath);
      return storagePaths;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  /**
   * Remove path from the workspace list
   * @param path
   */
  async removeStoragePath(path: string) {
    try {
      const config = JSON.parse(
        await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
      );
      config.storagePaths = config.storagePaths.filter(
        (p: string) => p !== path
      );
      if (config.storagePath === path) config.storagePath = "";
      await writeTextFile("workspace.json", JSON.stringify(config), {
        dir: BaseDirectory.AppConfig,
      });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * change path of a workspace
   * @param path
   */
  async moveWorkspace(oldPath: string, newPath: string) {
    try {
      // update config
      const config = JSON.parse(
        await readTextFile("workspace.json", { dir: BaseDirectory.AppConfig })
      );
      for (const [index, path] of config.storagePaths.entries()) {
        if (path === oldPath) config.storagePaths[index] = newPath;
      }
      if (config.storagePath === oldPath) config.storagePath = newPath;
      await writeTextFile("workspace.json", JSON.stringify(config), {
        dir: BaseDirectory.AppConfig,
      });
      // move the actual folder
      await renameFile(oldPath, newPath);
    } catch (error) {}
  }
}

export const db = new JsonDB();
