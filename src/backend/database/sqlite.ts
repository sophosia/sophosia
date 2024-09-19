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
    // store a meta, _id is understood as projectId
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS metas USING fts5 (_id, type, citationKey, originalTitle, title, abstract, issued, publisher, containerTitle, containerTitleShort, volume, DOI, ISBN, ISSN, URL, favorite, timestampAdded, timestampModified)"
    );
    // store the contents of pdf/epub of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS contents USING fts5 (projectId, page, content)"
    );
    // store the category of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS categories USING fts5 (projectId, category)"
    );
    // store the authors of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS authors USING fts5 (projectId, given, family, literal, affiliation)"
    );
    // store the notes of each meta, _id is noteId
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS notes USING fts5 (projectId, _id, type, content, timestampAdded, timestampModified)"
    );
    // store the annotations of each meta, _id is annotId
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS annotations USING fts5 (projectId, _id, type, rects, color, pageNumber, content, timestampAdded, timestampModified)"
    );
    // store the tags of each meta
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS tags USING fts5 (projectId, tag)"
    );
    // store the links
    await _sqldb.execute(
      "CREATE VIRTUAL TABLE IF NOT EXISTS links USING fts5 (source, target)"
    );
  }

  async queryData(pattern: string) {
    const _sqldb = await this.load();
    // search metas: title, abstract, doi, issn, isbn, journal
    const results =
      (await _sqldb?.select<{ projectId: string; extract: string }[]>(`
SELECT
  projectId,
  'Page '|| contents.page || ': ' || snippet(contents, 2, '<span class="highlight-class-place-holder">', '</span>', '...', 15) AS extract
FROM
    contents
WHERE
    content MATCH 'NEAR(${pattern})'

UNION

SELECT
    projectId,
    'Note ' || notes._id || ': ' || snippet(notes, 3, '<span class="highlight-class-place-holder">', '</span>', '...', 15) AS extract
FROM
    notes
WHERE
    content MATCH 'NEAR(${pattern})'
`)) || [];
    // group by projectId
    const matches = new Map<string, string[]>();
    for (const result of results) {
      if (!matches.has(result.projectId)) matches.set(result.projectId, []);
      matches.get(result.projectId)!.push(result.extract);
    }
    return matches;
  }
}

export const sqldb = new SQLDatabase();
