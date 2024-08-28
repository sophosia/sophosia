import Database from "tauri-plugin-sql-api";
import * as pdfjsLib from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
import {
  FileEntry,
  readBinaryFile,
  readDir,
  readTextFile,
} from "@tauri-apps/api/fs";
import { pathToId } from "./utils";
import { db } from "../database";
import { metadata } from "tauri-plugin-fs-extra-api";
import { extname } from "@tauri-apps/api/path";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

window.indexContent = indexContents;

async function indexContents() {
  const start = performance.now();
  await createTable();
  const storagePath = db.config.storagePath;
  const entries = await readDir(storagePath, { recursive: true });
  await processEntries(entries);
  const end = performance.now();
  console.log(`index content in js takes ${start - end}`);
}

async function processEntries(entries: FileEntry[]) {
  for (const entry of entries) {
    if (entry.children) processEntries(entry.children);
    const meta = await metadata(entry.path);
    if (meta.isDir) continue;
    const ext = await extname(entry.path);
    if (ext == "pdf") extractPDFText(entry.path);
    else if (ext == "md") {
      let name = entry.name!.slice(0, -3);
      if (`${name}/${name}.md` != pathToId(entry.path))
        extractMarkdownText(entry.path);
    } else if (ext == "json") {
      extractPDFAnnotText(entry.path);
    } else if (ext == "excalidraw") {
      extractExcalidrawText(entry.path);
    }
  }
}

async function extractPDFText(filePath: string) {
  const projectId = pathToId(filePath).split("/")[0];
  const buffer = await readBinaryFile(filePath);
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  for (
    let pageNumber = 1;
    pageNumber <= Math.min(10, pdf.numPages);
    pageNumber++
  ) {
    let page = await pdf.getPage(pageNumber);
    let content = await page.getTextContent();
    let text = content.items.map((item) => (item as TextItem).str).join("");
    insertData(projectId, `${pageNumber}`, text);
  }
}

async function extractMarkdownText(filePath: string) {
  const noteId = pathToId(filePath);
  const text = await readTextFile(filePath);
  insertData(noteId, "1", text);
}

async function extractPDFAnnotText(filePath: string) {}

async function extractExcalidrawText(filePath: string) {}

async function createTable() {
  const db = await Database.load("sqlite:contents.db");
  await db.execute(
    "CREATE VIRTUAL TABLE IF NOT EXISTS contents USING fts5 (id, page, content)"
  );
}

async function insertData(id: string, page: string, content: string) {
  const db = await Database.load("sqlite:contents.db");
  await db.execute(
    "INSERT INTO contents (id, page, content) SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT 1 FROM contents WHERE id = $1 AND page = $2)",
    [id, page, content]
  );
}

export async function queryData(pattern: string) {
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
