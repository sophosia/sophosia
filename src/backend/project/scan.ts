import {
  BaseDirectory,
  exists,
  readDir,
  readTextFile,
  FileEntry,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { Edge, idb } from "../database";
import { metadata } from "tauri-plugin-fs-extra-api";
import { updateLinks } from "./graph";
import { extname, sep } from "@tauri-apps/api/path";
import { addProject } from "./project";

/**
 * Scan all notes and update the links in indexeddb
 */
export async function scan() {
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
  const entries = await readDir(storagePath, { recursive: true });
  await processEntries(entries, { storagePath, lastScanTime });
  workspace.lastScanTime = Date.now();
  await writeTextFile("workspace.json", JSON.stringify(workspace), {
    dir: BaseDirectory.AppConfig,
  });
}

async function processEntries(
  entries: FileEntry[],
  params: { storagePath: string; lastScanTime: number }
) {
  for (const entry of entries) {
    // skip hidden folders or files
    if (entry.name![0] === ".") continue;

    // if dir/file is modified after last scan process it
    const meta = await metadata(entry.path);
    if (meta.isFile && meta.modifiedAt.getTime() > params.lastScanTime) {
      if ((await extname(entry.path)) !== "md") continue;
      let noteId = entry.path.replace(params.storagePath + sep, "");
      const links = await getLinksFromText(entry.path, params.storagePath);
      await updateLinks(noteId, links);
    } else if (entry.children) {
      // TODO: maybe we should do something about the newly created folder as well
      // add project to db
      // scan pdf file in the folder (assume there is only 1 pdf)
      // add pdf to project path
      await processEntries(entry.children, params);
    }
  }
}

/**
 * Extract all links given the absolute path of the markdown file
 * @param filePath absolute path of the markdown file
 * @returns links in the markdown file
 */
async function getLinksFromText(
  filePath: string,
  storagePath: string
): Promise<Edge[]> {
  const regex =
    /\[[\w\-\/\s\.\#\^]+\]\((?!www\.)(?!http:)(?!https:)[\w\-\/\.\#\^]+\)/gm;
  const content = await readTextFile(filePath);
  const matches = content.match(regex) || [];
  const links = [] as Edge[];
  for (const match of matches) {
    const submatch = match.match(/\(.*\)/)![0];
    const [mdPath, blockRef] = submatch.slice(1, -1).split("#"); // remove bracket and split
    let source = filePath.replace(storagePath + sep, "");
    let target = mdPath.replace(storagePath + sep, "");
    links.push({ source, target });
  }
  return links;
}
