import {
  BaseDirectory,
  exists,
  readDir,
  readTextFile,
  FileEntry,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { Edge, idb } from "../database";
import { metadata, Metadata } from "tauri-plugin-fs-extra-api";
import { updateLinks } from "./graph";
import { extname, sep } from "@tauri-apps/api/path";
import { ref } from "vue";
import { Notify } from "quasar";
import { idToLink, pathToId } from "./utils";
import { i18n } from "src/boot/i18n";
const { t } = i18n.global;

export const isScanned = ref(false); // to notify loading screen initially
export const isLinkUpdated = ref(false); // to notify the reloading of note editor
/**
 * Process each FileEntry with callback functions
 * @param entries
 * @param processFile callback function
 * @param processDir callback function
 */
export async function processEntries(
  entries: FileEntry[],
  processFile?: (file: FileEntry, meta: Metadata) => any,
  processDir?: (dir: FileEntry, meta: Metadata) => any
) {
  for (const entry of entries) {
    // skip hidden folders or files
    if (entry.name![0] === ".") continue;

    const meta = await metadata(entry.path);
    if (meta.isFile) {
      if (processFile) await processFile(entry, meta);
    } else if (entry.children) {
      if (processDir) await processDir(entry, meta);
      await processEntries(entry.children, processFile, processDir);
    }
  }
}

/**
 * Scan all notes and update the links in indexeddb
 */
export async function scanAndUpdateDB() {
  console.log("scan and update db");
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
    // only process note file
    if (!["md", "excalidraw"].includes(await extname(file.path))) return;
    const noteId = pathToId(file.path);
    // push the label and path of the note to indexeddb for faster retrival
    idb.put("notes", { noteId });

    // prepare links in indexed db
    const links = await getLinksFromFile(file.path, storagePath);
    await updateLinks(noteId, links);
  };

  await idb.clear("notes"); // clear notes store before scaning
  await idb.clear("links"); // clear links store before scaning
  const entries = await readDir(storagePath, { recursive: true });
  await processEntries(entries, processFile);

  workspace.lastScanTime = Date.now();
  await writeTextFile("workspace.json", JSON.stringify(workspace), {
    dir: BaseDirectory.AppConfig,
  });

  isScanned.value = true;
}

/**
 * Extract all links given the absolute path of the markdown file
 * @param filePath absolute path of the markdown file
 * @returns links in the markdown file
 */
async function getLinksFromFile(
  filePath: string,
  storagePath: string
): Promise<Edge[]> {
  const regex = /\[.*\]\((?!www\.)(?!http:)(?!https:).*\)/gm;
  const content = await readTextFile(filePath);
  const matches = content.match(regex) || [];
  const links = [] as Edge[];
  for (const match of matches) {
    const submatch = match.match(/\(.*\)/)![0];
    const [idOrDeepLink, blockRef] = submatch.slice(1, -1).split("#"); // remove bracket and split
    let source = pathToId(filePath);
    let target = idOrDeepLink.replace("sophosia://open-item/", "");
    links.push({ source, target });
  }
  return links;
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

  Notify.create(t("links-updated"));
  isLinkUpdated.value = true;
}
