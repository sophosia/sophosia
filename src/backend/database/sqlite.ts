/**
 * The sqlite database is only to boost the query efficiency and simplify the query process.
 * The data is physically stored in user's selected folder in forms of markdown, excalidraw and json.
 * Each time the app starts, user's selected storage folder will be scan and data will be extracted and inserted into sqlite db.
 * Each workspace has its own sqlite database.
 */
import Database from "tauri-plugin-sql-api";
import { simpleHash } from "../project/utils";
import { BaseDirectory, readTextFile } from "@tauri-apps/api/fs";
import { db } from "./jsondb";

export async function getSqlDatabase() {
  try {
    const workspace = JSON.parse(
      await readTextFile("workspace.json", {
        dir: BaseDirectory.AppConfig,
      })
    );
    const { storagePath, lastScanTime } = workspace;
    return await Database.load(`sqlite:${simpleHash(storagePath)}.db`);
  } catch (error) {
    console.log(error);
    return;
  }
}

/**
 * Creates virtual tables if they do not exist, do nothing if they exist.
 */
export async function createDBTables() {
  const databaseId = simpleHash(db.config.storagePath);
  const sqldb = await Database.load(`sqlite:${databaseId}.db`);
  // store a meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS metas USING fts5 (meta_id, type, citation_key, title, translated_title, abstract, year, publisher, journal, volume, doi, isbn, arxivid, url, favorite, timestamp_added, timestamp_modified)"
  );
  // store the contents of pdf/epub of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS contents USING fts5 (meta_id, page, content)"
  );
  // store the category of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS categories USING fts5 (meta_id, category)"
  );
  // store the authors of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS authors USING fts5 (meta_id, given, family, literal, affiliation)"
  );
  // store the notes of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS notes USING fts5 (meta_id, note_id, type, content, timestamp_added, timestamp_modified)"
  );
  // store the annotations of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS annotations USING fts5 (meta_id, annot_id, type, rects, color, page_number, content, timestamp_added, timestamp_modified)"
  );
  // store the tags of each meta
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS tags USING fts5 (meta_id, tag)"
  );
  // store the links
  await sqldb.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS links USING fts5 (source, target)"
  );
}

/**
 * Delete sqlite table with tableName for current workspace
 *
 * @param {string} tableName - table name in sqlite db
 */
export async function deleteDBTable(tableName: string) {
  const databaseId = simpleHash(db.config.storagePath);
  const sqldb = await Database.load(`sqlite:${databaseId}.db`);
  await sqldb.execute(`DELETE FROM ${tableName}`);
}
