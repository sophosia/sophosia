import { db, FolderOrNote, idb, Note, NoteType } from "../database";
import { Buffer } from "buffer";
import {
  exists,
  createDir,
  readTextFile,
  writeTextFile,
  writeBinaryFile,
  readDir,
  renameFile,
  removeFile,
  removeDir,
} from "@tauri-apps/api/fs";
import { join, extname, basename, sep } from "@tauri-apps/api/path";
import type { FileEntry } from "@tauri-apps/api/fs";
import { batchReplaceLink } from "./scan";
import { updateLinks } from "./graph";
import { metadata, Metadata } from "tauri-plugin-fs-extra-api";
import { idToPath, pathToId, sortTree } from "./utils";
import { i18n } from "src/boot/i18n";
const { t } = i18n.global;

/**
 * Create a note
 * @param folderId
 * @param type
 */
export async function createNote(folderId: string, type: NoteType) {
  const splits = folderId.split("/");
  const projectId = splits[0];
  let ext = type === NoteType.MARKDOWN ? ".md" : ".excalidraw";
  let name = t("new", { type: t("note") });
  let path = await join(db.config.storagePath, ...splits, name + ext);
  let i = 1;
  while (await exists(path)) {
    name = `${t("new", { type: t("note") })} ${i}`;
    path = await join(db.config.storagePath, ...splits, name + ext);
    i++;
  }
  const noteId = pathToId(path);

  const note = {
    _id: noteId,
    dataType: "note",
    projectId: projectId,
    label: name + ext,
    path: path,
    type: type,
  } as Note;

  return note;
}

/**
 * and creates the actual markdown file in project folder
 * @param note
 * @returns updated note
 */
export async function addNote(note: Note): Promise<Note | undefined> {
  try {
    // create actual file
    await writeTextFile(idToPath(note._id), "");

    // add to db
    await idb.put("notes", { noteId: note._id });
    return note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a note from disk
 * @param noteId
 */
export async function deleteNote(noteId: string) {
  try {
    await removeFile(idToPath(noteId));

    // update db
    await idb.delete("notes", noteId);
    await updateLinks(noteId, []); // delete all links starting from this note
  } catch (error) {
    console.log(error);
  }
}

/**
 * Update information of a note data according to the new label
 * @param noteId
 * @param props - update properties
 */
export async function renameNote(oldNoteId: string, newNoteId: string) {
  try {
    const oldPath = idToPath(oldNoteId);
    const ext = await extname(oldPath);
    try {
      await extname(newNoteId); // if the label has extension, do nothing
    } catch (error) {
      newNoteId += `.${ext}`; // if not, add extension to the end
    }
    const newPath = idToPath(newNoteId);

    await renameFile(oldPath, newPath);

    // update db
    // update note in notes store
    await idb.delete("notes", oldNoteId);
    await idb.put("notes", { noteId: newNoteId });
    // replace all related links in other markdown files and update indexeddb
    await batchReplaceLink(oldNoteId, newNoteId);

    return {
      _id: newNoteId,
      dataType: "note",
      type: ext === "md" ? NoteType.MARKDOWN : NoteType.EXCALIDRAW,
      projectId: newNoteId.split("/")[0],
      path: newPath,
      label: await basename(newNoteId),
    } as Note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get a note by its ID
 * @param {string} noteId
 * @returns {Note} note
 */
export async function getNote(noteId: string): Promise<Note | undefined> {
  try {
    const ext = await extname(noteId);
    if (!["md", "excalidraw"].includes(ext)) return;
    const splits = noteId.split("/");
    const projectId = splits[0];
    const label = splits[splits.length - 1];
    const path = idToPath(noteId);
    const note = {
      _id: noteId,
      dataType: "note",
      projectId: projectId,
      label: label,
      path: path,
      type: ext === "md" ? NoteType.MARKDOWN : NoteType.EXCALIDRAW,
    } as Note;
    return note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get all notes in a specific folder
 * @param folderId
 * @returns array of notes
 */
export async function getNotes(folderId: string): Promise<Note[]> {
  try {
    const notes = [] as Note[];
    async function processEntries(entries: FileEntry[]) {
      for (const entry of entries) {
        const meta = await metadata(entry.path);
        if (meta.isFile) {
          const ext = await extname(entry.path);
          if (!["md", "excalidraw"].includes(ext)) continue;

          const noteId = pathToId(entry.path);
          const splits = noteId.split("/");
          const projectId = splits[0];
          // skip folder note
          if (noteId === `${projectId}/${projectId}.md`) continue;
          const label = splits[splits.length - 1];
          notes.push({
            _id: noteId,
            dataType: "note",
            projectId: projectId,
            label: label,
            path: entry.path,
            type: ext === "md" ? NoteType.MARKDOWN : NoteType.EXCALIDRAW,
          } as Note);
        } else if (entry.children) {
          await processEntries(entry.children);
        }
      }
    }
    const entries = await readDir(idToPath(folderId), { recursive: true });
    await processEntries(entries);
    // sort by label
    return notes.sort((n1, n2) => (n1.label < n2.label ? -1 : 1));
  } catch (error) {
    console.log(error);
    return [];
  }
}

/**
 * Get notes of a project and returns the tree of these notes
 */
export async function getNoteTree(projectId: string) {
  async function _dfs(entries: FileEntry[], children: FolderOrNote[]) {
    for (const entry of entries) {
      const meta = await metadata(entry.path);
      const node = {} as FolderOrNote;
      node._id = pathToId(entry.path);
      node.label = entry.name as string;
      if (meta.isFile) {
        const ext = await extname(entry.path);
        if (!["md", "excalidraw"].includes(ext)) continue;
        if (entry.name == projectId + ".md") continue; // skip project note
        node.dataType = "note";
        node.type = ext === "md" ? NoteType.MARKDOWN : NoteType.EXCALIDRAW;
      } else if (entry.children) {
        node.dataType = "folder";
        node.children = [] as FolderOrNote[];
        await _dfs(entry.children, node.children);
      }
      children.push(node);
    }
  }

  const entries = await readDir(await join(db.config.storagePath, projectId), {
    recursive: true,
  });
  const notes = [] as FolderOrNote[];
  await _dfs(entries, notes);
  return notes;
}

/**
 * Get all notes in database
 * @returns array of noteIds
 */
export async function getAllNotes(): Promise<string[]> {
  return await idb.getAllKeys("notes");
}

/**
 * Load note content from disk as markdown string
 * @param {string} noteId
 * @returns {string} content
 */
export async function loadNote(
  noteId: string,
  notePath?: string
): Promise<string> {
  try {
    const note = (await getNote(noteId)) as Note;
    return await readTextFile(notePath || idToPath(note._id));
  } catch (error) {
    return "";
  }
}

/**
 * Save markdown content to disk
 * @param {string} noteId
 * @param {string} content
 */
export async function saveNote(
  noteId: string,
  content: string,
  notePath?: string
) {
  try {
    await writeTextFile(notePath || idToPath(noteId), content);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Upload image and save it under the project folder
 * If /img doesn't exist, it will create this folder
 * @param {string} noteId
 * @param {File} file
 */
export async function uploadImage(
  file: File
): Promise<{ imgName: string; imgPath: string } | undefined> {
  if (!file.type.includes("image")) return;

  try {
    const imgType: string = await extname(file.name); // png
    const imgName: string = `SI${db.nanoid}.${imgType}`; // use nanoid as img name
    const imgFolder: string = await join(
      db.config.storagePath,
      ".sophosia",
      "image"
    );
    const imgPath: string = await join(imgFolder, imgName);
    if (!(await exists(imgFolder))) await createDir(imgFolder);

    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    await writeBinaryFile(imgPath, Buffer.from(arrayBuffer));
    return { imgName: imgName, imgPath: imgName };
  } catch (error) {
    console.log(error);
  }
}

export async function createFolder(parentFolderId: string) {
  let name = t("new", { type: t("folder") });
  let path = await join(idToPath(parentFolderId), name);
  let i = 1;
  while (await exists(path)) {
    name = `${t("new", { type: t("folder") })} ${i}`;
    path = await join(idToPath(parentFolderId), name);
    i++;
  }

  const folder = {
    _id: pathToId(path),
    dataType: "folder",
    label: name,
    path: path,
    children: [],
  } as FolderOrNote;

  return folder;
}

export async function addFolder(folder: FolderOrNote) {
  try {
    await createDir(idToPath(folder._id));
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a folder and its containing notes
 * Also delete the links in indexeddb
 * @param folderId
 */
export async function deleteFolder(folderId: string) {
  try {
    // remove notes from indexeddb first
    const notes = await getNotes(folderId);
    for (const note of notes) {
      await idb.delete("notes", note._id);
      await updateLinks(note._id, []); // delete all links starting from this note
    }

    // remove the actual folder
    await removeDir(idToPath(folderId), { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Rename folder and update note links
 * @param oldFolderId
 * @param newFolderId
 */
export async function renameFolder(oldFolderId: string, newFolderId: string) {
  try {
    // update indexeddb
    const notes = await getNotes(oldFolderId);
    for (const note of notes) {
      await idb.delete("notes", note._id);
      const newNoteId = note._id.replace(oldFolderId, newFolderId);
      await idb.put("notes", { noteId: newNoteId });
      await batchReplaceLink(note._id, newNoteId);
    }

    // rename actual folder
    const oldPath = idToPath(oldFolderId);
    const newPath = idToPath(newFolderId);
    await renameFile(oldPath, newPath);
  } catch (error) {
    console.log(error);
  }
}
