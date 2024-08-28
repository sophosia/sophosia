import {
  BaseDirectory,
  FileEntry,
  exists,
  readDir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { extname } from "@tauri-apps/api/path";
import { Notify } from "quasar";
import { i18n } from "src/boot/i18n";
import { Metadata, metadata } from "tauri-plugin-fs-extra-api";
import { ref } from "vue";
import {
  AnnotationData,
  Author,
  Edge,
  NoteType,
  Project,
  db,
} from "../database";
import { idToLink, idToPath, linkToId, pathToId, simpleHash } from "./utils";
const { t } = i18n.global;
import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { createDBTables, getSqlDatabase } from "../database/sqlite";
import { getProject } from "./project";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

export const isLinkUpdated = ref(false); // to notify the reloading of note editor

/**
 * Scan all notes and update the links in database
 */
export async function indexFiles() {
  console.log("scan files and update db");
  const start = performance.now();
  await createDBTables();
  await removeDanglingData();

  const entries = await readDir(db.config.storagePath, { recursive: true });
  await processEntries(entries);
  const end = performance.now();
  console.log(`files scan took ${end - start} ms`);
}

async function removeDanglingData() {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  // check if the meta_id still has physical folders
  const results = (await sqldb.select("SELECT meta_id FROM metas")) as {
    meta_id: string | null;
  }[];
  const removedItemIds = [] as string[];
  for (const result of results) {
    if (result.meta_id && !(await exists(idToPath(result.meta_id))))
      removedItemIds.push(result.meta_id);
  }

  // remove the rows with meta_id if that meta has been removed from user's storagePath
  const placeholders = removedItemIds
    .map((_, index) => `$${index + 1}`)
    .join(", ");
  const queries = [
    `DELETE FROM metas WHERE meta_id IN (${placeholders})`,
    `DELETE FROM authors WHERE meta_id IN (${placeholders})`,
    `DELETE FROM contents WHERE meta_id IN (${placeholders})`,
    `DELETE FROM notes WHERE meta_id IN (${placeholders})`,
    `DELETE FROM annotations WHERE meta_id IN (${placeholders})`,
    `DELETE FROM tags WHERE meta_id IN (${placeholders})`,
    `DELETE FROM links WHERE source IN (${placeholders}) OR target IN (${placeholders})`,
  ];
  for (const query of queries) await sqldb.execute(query, removedItemIds);
}

/**
 * Process each FileEntry with callback functions
 * @param entries [FileEntry] - FileEntries to process
 */
async function processEntries(entries: FileEntry[]) {
  for (const entry of entries) {
    const meta = await metadata(entry.path);
    if (meta.isFile && meta.modifiedAt.getTime() > db.config.lastScanTime) {
      await processFile(entry);
    } else if (entry.children) {
      await processEntries(entry.children);
    }
  }
}

async function processFile(file: FileEntry) {
  const ext = await extname(file.path);
  switch (ext) {
    case "md":
      if (
        pathToId(file.path) ==
        `${file.name!.slice(0, -3)}/${file.name!.slice(0, -3)}.md`
      ) {
        // folder note
        console.log("processing folder note", file.path);
        extractMetaFromMarkdown(file.path);
      } else {
        // normal note
        extractMarkdownContent(file.path);
        extractMarkdownLinks(file.path);
      }
      break;
    case "excalidraw":
      extractExcalidrawContent(file.path);
      break;
    case "pdf":
      extractPDFContent(file.path);
      break;
    case "json":
      if (file.name!.startsWith("SA")) extractAnnotContent(file.path);
      break;
    default:
      break;
  }
}

/**
 * Extract meta data from a folder note
 *
 * @param {string} filePath - path to the folder note
 */
async function extractMetaFromMarkdown(filePath: string) {
  const projectId = pathToId(filePath).split("/")[0];
  const project = (await getProject(projectId)) as Project;
  insertMeta(project);
  insertAuthors(projectId, project.author);
  insertTags(projectId, project.tags);
  insertCategories(projectId, project.categories);
}

/**
 * Extract content from a normal markdown note
 *
 * @param {string} filePath - path to the markdown note
 */
async function extractMarkdownContent(filePath: string) {
  const noteId = pathToId(filePath);
  const projectId = noteId.split("/")[0];
  const content = await readTextFile(filePath);
  const meta = await metadata(filePath);
  const note = {
    id: noteId,
    projectId: projectId,
    type: NoteType.MARKDOWN,
    timestampAdded: meta.createdAt.getTime(),
    timestampModified: meta.modifiedAt.getTime(),
    content: content,
  };
  insertNote(note);
}

/**
 * Extract all out links given the content of the markdown file
 *
 * @param filePath[string] - absolute path to the markdown file
 */
async function extractMarkdownLinks(filePath: string) {
  const source = pathToId(filePath);
  const content = await readTextFile(filePath);
  const regex = /\[.*\]\((?!www\.)(?!http:)(?!https:).*\)/gm;
  const matches = content.match(regex) || [];
  for (const match of matches) {
    const submatch = match.match(/\(.*\)/)![0];
    const [idOrDeepLink, blockRef] = submatch.slice(1, -1).split("#"); // remove bracket and split
    let target = linkToId(idOrDeepLink);
    insertLink({ source, target });
  }
}

/**
 * Extract texts from an excalidraw file
 *
 * @param {string} filePath - absolute path to the excalidraw file
 */
async function extractExcalidrawContent(filePath: string) {
  const meta = await metadata(filePath);
  const data = JSON.parse(await readTextFile(filePath));
  let texts = [] as string[];
  for (const element of data.elements) {
    if (element.type === "text" && !element.isDeleted) {
      texts.push(`${element.text}`);
    }
  }
  const noteId = pathToId(filePath);
  const projectId = noteId.split("/")[0];
  const content = texts.join("\n");
  const note = {
    id: noteId,
    projectId: projectId,
    type: NoteType.EXCALIDRAW,
    timestampAdded: meta.createdAt.getTime(),
    timestampModified: meta.modifiedAt.getTime(),
    content: content,
  };
  insertNote(note);
}

/**
 * Extract text from a PDF file
 *
 * @param {string} filePath - absolute path to the PDF
 */
async function extractPDFContent(filePath: string) {
  const projectId = pathToId(filePath).split("/")[0];
  // const buffer = await readBinaryFile(filePath);
  const url = convertFileSrc(filePath);
  const pdf = await pdfjsLib.getDocument({ url }).promise;
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    let page = await pdf.getPage(pageNumber);
    let content = await page.getTextContent();
    let text = content.items.map((item) => (item as TextItem).str).join("");
    insertContent(projectId, `${pageNumber}`, text);
  }
}

/**
 * Extract content of a PDF annotation
 *
 * @param {string} filePath - absolute path to the annotation json file
 */
async function extractAnnotContent(filePath: string) {
  const annot = JSON.parse(await readTextFile(filePath)) as AnnotationData;
  insertAnnot(annot);
}

/**
 * Insert link into links table
 *
 * @param {Edge} link - an markdown link pointing to some other item
 */
async function insertLink(link: Edge) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  await sqldb.execute(
    "INSERT INTO links (source, target) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM links WHERE source = $1 AND target = $2)",
    [link.source, link.target]
  );
}

/**
 * Insert annotation into pdf_annotations table
 *
 * @param {AnnotationData} annot - a PDF annotaiton
 */
async function insertAnnot(annot: AnnotationData) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  await sqldb.execute("DELETE FROM annotations WHERE annot_id = $1", [
    annot._id,
  ]);
  await sqldb.execute(
    `INSERT INTO annotations (meta_id, annot_id, type, rects, color, page_number, content, timestamp_added, timestamp_modified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      annot.projectId,
      annot._id,
      annot.type,
      JSON.stringify(annot.rects),
      annot.color,
      annot.pageNumber,
      annot.content,
      annot.timestampAdded,
      annot.timestampModified,
    ]
  );
}

/**
 * Insert a note into notes table
 *
 * @param {[TODO:type]} note - note to be inserted
 */
async function insertNote(note: {
  id: string;
  projectId: string;
  type: NoteType;
  content: string;
  timestampAdded: number;
  timestampModified: number;
}) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  await sqldb.execute("DELETE FROM notes WHERE note_id = $1", [note.id]);
  await sqldb.execute(
    `INSERT INTO notes (meta_id, note_id, type, content, timestamp_added, timestamp_modified)
VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      note.projectId,
      note.id,
      note.type,
      note.content,
      note.timestampAdded,
      note.timestampModified,
    ]
  );
}

/**
 * Insert text of PDF into contents table
 *
 * @param {string} projectId - id of the meta
 * @param {string} page - page number of the content
 * @param {string} content - content of specific page
 */
async function insertContent(projectId: string, page: string, content: string) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  await sqldb.execute("DELETE FROM contents WHERE meta_id = $1", [projectId]);
  await sqldb.execute(
    "INSERT INTO contents (meta_id, page, content) VALUES ($1, $2, $3)",
    [projectId, page, content]
  );
}

/**
 * Insert meta of a project into metas table
 *
 * @param {Project} meta - meta to be inserted
 */
async function insertMeta(meta: Project) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  if (meta["original-title"] && !Array.isArray(meta["original-title"])) {
    meta["translated-title"] = meta["title"];
    meta["title"] = meta["original-title"];
  }
  await sqldb.execute("DELETE FROM metas WHERE meta_id = $1", [meta._id]);
  await sqldb.execute(
    `INSERT INTO metas (meta_id, type, citation_key, title, translated_title, abstract, year, publisher, journal, volume, doi, isbn, url, favorite, timestamp_added, timestamp_modified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      meta._id,
      meta.type || "",
      meta["citation-key"],
      meta.title,
      meta["translated-title"] || "",
      meta.abstract || "",
      meta.issued?.["date-parts"][0][0] || "",
      meta.publisher || "",
      meta["container-title"] || "",
      meta.volume || "",
      meta.DOI || "",
      meta.ISBN || "",
      meta.URL || "",
      !!meta.favorite,
      meta.timestampAdded,
      meta.timestampModified,
    ]
  );
}

/**
 * Insert authors into authors table and insert relations of authors to a project
 *
 * @param {string} projectId - id to the meta
 * @param {Author[]} authors - list of authors to be inserted
 */
async function insertAuthors(projectId: string, authors: Author[]) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  for (const author of authors) {
    const given = author.given || "";
    const family = author.family || "";
    const literal = author.literal || "";
    const affiliation = author.literal || "";
    const authorId = simpleHash(
      given.toLowerCase() +
        family.toLowerCase() +
        literal.toLowerCase() +
        affiliation.toLowerCase()
    );
    // insert the meta-author relation into authors table
    sqldb.execute(
      `INSERT INTO authors (meta_id, given, family, literal, affiliation)
SELECT $1, $2, $3, $4, $5
WHERE NOT EXISTS (SELECT 1 FROM authors WHERE meta_id = $1)`,
      [projectId, given, family, literal, affiliation]
    );
  }
}

/**
 * Insert tags of a project into the tags table
 *
 * @param {string} projectId - id of the meta
 * @param {string[]} tags - keywords of the proejcts
 */
async function insertTags(projectId: string, tags: string[]) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  for (const tag of tags) {
    sqldb.execute(
      `INSERT INTO tags (meta_id, tag)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE meta_id = $1 AND tag = $2)`,
      [projectId, tag]
    );
  }
}

/**
 * Insert categories of a project into the categories table
 *
 * @param {string} projectId - id of the project
 * @param {any} categories - the categories the project belongs to
 */
async function insertCategories(projectId: string, categories: any) {
  const sqldb = await getSqlDatabase();
  if (!sqldb) return;
  for (const category of categories) {
    sqldb.execute(
      `INSERT INTO categories (meta_id, category)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE meta_id = $1 AND category = $2)`,
      [projectId, category]
    );
  }
}

/**
 * Replace all associated links in all markdown notes if a note is renamed
 * @param oldNoteId
 * @param newNoteId
 */
export async function batchReplaceLink(oldNoteId: string, newNoteId: string) {
  // need to update links from the oldNote

  // no need to scan anything if user is using it the first time
  if (!(await exists("workspace.json", { dir: BaseDirectory.AppConfig })))
    return;

  // path in jsondb is not ready yet, must use this
  const workspace = JSON.parse(
    await readTextFile("workspace.json", {
      dir: BaseDirectory.AppConfig,
    })
  );
  const { storagePath, lastScanTime } = workspace;

  const processFile = async (file: FileEntry, meta: Metadata) => {
    // only process markdown file
    if ((await extname(file.path)) !== "md") return;

    let content = await readTextFile(file.path);
    const regex = new RegExp(
      `\\[${oldNoteId}\\#?\\w*\\]\\(${idToLink(oldNoteId)}\\#?\\w*\\)`,
      "gm"
    );
    const localRegex = new RegExp(
      `\\[${oldNoteId}\\#?\\w*\\]\\(${idToLink(oldNoteId)}\\#?\\w*\\)`,
      "m"
    ); // remove g modifier to make match return after first found
    const matches = content.match(localRegex);
    if (matches) {
      const oldIdAndHashtag = matches[0].match(/\[.*\]/)![0].slice(1, -1); // remove bracket using slice
      const oldLinkAndHashtag = matches[0].match(/\(.*\)/)![0].slice(1, -1);
      const newIdAndHashtag = oldIdAndHashtag.replace(oldNoteId, newNoteId);
      const newLinkAndHashtag = oldLinkAndHashtag.replace(
        idToLink(oldNoteId),
        idToLink(newNoteId)
      );
      const newContent = content.replaceAll(
        regex,
        `[${newIdAndHashtag}](${newLinkAndHashtag})`
      );
      await writeTextFile(file.path, newContent);
    }

    const currentNoteId = pathToId(file.path);
    // replace to links in indexeddb pointing to the old note
    const key1 = await idb.getKeyFromIndex("links", "sourceAndTarget", [
      currentNoteId,
      oldNoteId,
    ]);
    if (key1)
      idb.put("links", { source: currentNoteId, target: newNoteId }, key1);

    // replace to links in indexeddb from the old note
    const key2 = await idb.getKeyFromIndex("links", "sourceAndTarget", [
      oldNoteId,
      currentNoteId,
    ]);
    if (key2)
      idb.put("links", { source: newNoteId, target: currentNoteId }, key2);
  };

  const entries = await readDir(storagePath, { recursive: true });
  await processEntries(entries, processFile);

  Notify.create(t("updated", { type: t("link") }));
  isLinkUpdated.value = true;
}
