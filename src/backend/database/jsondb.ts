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
import { customAlphabet } from "nanoid";
import { reactive } from "vue";
import type { Config } from "./models";
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

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

  /**
   * Retrieves a document by its ID from storage.
   *
   * @param {string} id - The identifier of the document.
   * @returns {Promise<Doc>} The document associated with the given ID.
   * @throws Error if storage path is not set or if the document is not found.
   *
   * Determines the file path based on the ID and reads the document from storage.
   */
  async get(id: string): Promise<Doc> {
    if (!this.config.storagePath) throw Error("storagePath not set");
    const code2Folder = {
      SA: "pdfAnnotation",
      SS: "pdfState",
    };
    let path = "";
    if (id.slice(0, 2) in code2Folder)
      path = await join(
        this.config.storagePath,
        ".sophosia",
        code2Folder[id.slice(0, 2) as "SA" | "SS"],
        `${id}.json`
      );
    else if (id === "notebook")
      path = await join(
        this.config.storagePath,
        ".sophosia",
        "project",
        `${id}.json`
      );
    else
      path = await join(this.config.storagePath, ".sophosia", id, `${id}.json`);
    if (await exists(path)) return JSON.parse(await readTextFile(path));
    throw Error(`data with id=${id} not found`);
  }

  /**
   * Stores a document in the storage.
   *
   * @param {Doc} doc - The document to store or update.
   * @throws Error if the storage path is not set.
   *
   * Serializes the document as JSON and writes it to the specified path.
   */
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

  /**
   * Asynchronously adds a new document with a unique ID to the storage.
   *
   * @param {Object} doc - An object with the 'dataType' property.
   * @throws Error if the storage path is not configured.
   *
   * Generates a unique '_id' for the document, then uses the 'put' method to store it.
   */
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

  /**
   * Retrieves all documents of a specific data type from storage.
   *
   * @param {string} dataType - The type of the documents to retrieve.
   * @returns {Promise<Doc[]>} An array of documents of the specified type.
   * @throws Error if the storage path is not set.
   *
   * Reads all files from the directory associated with the dataType, parses them as JSON, and returns them.
   */
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

  /**
   * Stores multiple documents in storage in bulk.
   *
   * @param {Doc[]} docs - An array of documents to be stored.
   * @throws Error if the storage path is not set.
   *
   * Utilizes the 'put' method to store each document. Handles errors individually for each document.
   */
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

  /**
   * Loads and sets configuration settings from a JSON file.
   *
   * Reads the 'workspace.json' file and updates the configuration settings.
   * Defaults are provided for unspecified settings.
   *
   * Handles and logs any errors that occur during file reading or parsing.
   */
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

  /**
   * Updates and saves configuration settings to a JSON file.
   *
   * @param {Config} config - The configuration settings to be updated.
   *
   * Validates and updates the application's configuration based on the provided 'config' object.
   * Ensures the configuration directory exists before saving the file.
   * Handles and logs any errors during the update and save process.
   */
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

  /**
   * Creates a series of hidden folders for application data storage.
   *
   * Ensures the existence of a base '.sophosia' folder and specific subfolders within the configured storage path.
   * Handles and logs any errors encountered during folder creation.
   *
   * @throws Error if the storage path is not set.
   */

  async createHiddenFolders() {
    if (!this.config.storagePath) throw Error("storagePath not set");
    try {
      for (let folder of [
        "appState",
        "layout",
        "pdfAnnotation",
        "pdfState",
        "image",
        "plugin",
      ]) {
        const folderPath = await join(
          this.config.storagePath,
          ".sophosia",
          folder
        );
        if (!(await exists(folderPath)))
          await createDir(folderPath, { recursive: true });
      }
    } catch (error) {
      // the folders might exists already
      console.log(error);
    }
  }
}

export const db = new JsonDB();
