/**
 * The sqlite database is only to boost the query efficiency and simplify the query process.
 * The data is physically stored in user's selected folder in forms of markdown, excalidraw and json.
 * Each time the app starts, user's selected storage folder will be scan and data will be extracted and inserted into sqlite db.
 * Each workspace has its own sqlite database.
 */
import Database from "tauri-plugin-sql-api";
import { simpleHash } from "../utils";
import { db } from "./jsondb";
import { ref } from "vue";

class SQLDatabase {
  readyToRead = ref(false);

  async load() {
    if (!db.config.storagePath) return;
    else
      return await Database.load(
        `sqlite:${simpleHash(db.config.storagePath)}.db`
      );
  }

  async execute(query: string, bindValues?: unknown[]) {
    const _sqldb = await this.load();
    return _sqldb && (await _sqldb.execute(query, bindValues));
  }

  async select<T>(query: string, bindValues?: unknown[]) {
    const _sqldb = await this.load();
    return (
      this.readyToRead && _sqldb && (await _sqldb.select<T>(query, bindValues))
    );
  }

  /**
   * Creates virtual tables if they do not exist, do nothing if they exist.
   */
  async createTables() {
    const _sqldb = await this.load();
    if (!_sqldb) return;
    // store a meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS metas USING fts5 (meta_id, type, citation_key, title, translated_title, abstract, year, publisher, journal, volume, doi, isbn, arxivid, url, favorite, timestamp_added, timestamp_modified)"
    );
    // store the contents of pdf/epub of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS contents USING fts5 (meta_id, page, content)"
    );
    // store the category of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS categories USING fts5 (meta_id, category)"
    );
    // store the authors of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS authors USING fts5 (meta_id, given, family, literal, affiliation)"
    );
    // store the notes of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS notes USING fts5 (meta_id, note_id, type, content, timestamp_added, timestamp_modified)"
    );
    // store the annotations of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS annotations USING fts5 (meta_id, annot_id, type, rects, color, page_number, content, timestamp_added, timestamp_modified)"
    );
    // store the tags of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS tags USING fts5 (meta_id, tag)"
    );
    // store the links
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS links USING fts5 (source, target)"
    );
  }

  async queryData(pattern: string) {
    const db = await Database.load("sqlite:contents.db");
    return await db.select(
      `
SELECT
  id,
  group_concat(page, ',') as pages,
  group_concat(extract, '</br>') as extracts
FROM (
  SELECT
    id,
    page,
    snippet(contents, 2, '<span class="highlight-class-place-holder">', '</span>', '...', 15) as extract
  FROM
    contents
  WHERE
    content MATCH 'NEAR(${pattern})'
  LIMIT -1 OFFSET 0) fts
GROUP BY id
LIMIT 100;
`
    );
  }
}

export const sqldb = new SQLDatabase();
