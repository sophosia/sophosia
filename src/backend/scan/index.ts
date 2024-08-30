import { FileEntry, exists, readDir, readTextFile } from "@tauri-apps/api/fs";
import { extname } from "@tauri-apps/api/path";
import { metadata } from "tauri-plugin-fs-extra-api";
import {
  AnnotationData,
  Edge,
  NoteType,
  Project,
  db,
  sqldb,
} from "../database";
import { idToPath, linkToId, pathToId } from "../utils";
import * as pdfjsLib from "pdfjs-dist";
import { getProject, extractPDFContent } from "../project";
import {
  insertCategories,
  insertTags,
  insertAuthors,
  insertMeta,
} from "../project/sqliteOps";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

/**
 * Scan all notes and update the links in database
 */
export async function indexFiles() {
  console.log("scan files and update db");
  const start = performance.now();
  await sqldb.createTables();
  await removeDanglingData();

  const entries = await readDir(db.config.storagePath, { recursive: true });
  await processEntries(entries, async (file: FileEntry) => {
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
  });
  sqldb.readyToRead.value = true;
  const end = performance.now();
  console.log(`files scan took ${end - start} ms`);
}

async function removeDanglingData() {
  // check if the meta_id still has physical folders
  const results =
    (await sqldb.select<{ meta_id: string | null }[]>(
      "SELECT meta_id FROM metas"
    )) || [];
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
export async function processEntries(
  entries: FileEntry[],
  processFile: (entry: FileEntry) => Promise<void>
) {
  for (const entry of entries) {
    const meta = await metadata(entry.path);
    if (meta.isFile && meta.modifiedAt.getTime() > db.config.lastScanTime) {
      await processFile(entry);
    } else if (entry.children) {
      await processEntries(entry.children, processFile);
    }
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
 * @param {{
  id: string;
  projectId: string;
  type: NoteType;
  content: string;
  timestampAdded: number;
  timestampModified: number;
}} note - note to be inserted
 */
async function insertNote(note: {
  id: string;
  projectId: string;
  type: NoteType;
  content: string;
  timestampAdded: number;
  timestampModified: number;
}) {
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
