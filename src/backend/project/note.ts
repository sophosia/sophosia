import { db, idb, Note, NoteType } from "../database";
import { Buffer } from "buffer";
import { createFile, deleteFile } from "./file";
import {
  exists,
  createDir,
  readTextFile,
  writeTextFile,
  writeBinaryFile,
  readDir,
  renameFile,
} from "@tauri-apps/api/fs";
import { join, extname, basename, sep } from "@tauri-apps/api/path";
import type { FileEntry } from "@tauri-apps/api/fs";
import { batchReplaceLink } from "./scan";
import { updateLinks } from "./graph";
import { metadata } from "tauri-plugin-fs-extra-api";
import { IdToPath, pathToId } from "./utils";
import { i18n } from "src/boot/i18n";
const { t } = i18n.global;

/**
 * Create a note
 * @param projectId
 * @param type
 */
export async function createNote(projectId: string, type: NoteType) {
  let i = 1;
  let ext = type === NoteType.MARKDOWN ? ".md" : ".excalidraw";
  let name = t("new-note");
  let path = await join(db.storagePath, projectId, name + ext);
  while (await exists(path)) {
    name = `${t("new-note")} ${i}`;
    path = await join(db.storagePath, projectId, name + ext);
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
    await createFile(note.projectId, note.label);

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
export async function deleteNote(note: Note) {
  try {
    await deleteFile(note.path);

    // update db
    await idb.delete("notes", note._id);
    await updateLinks(note._id, []); // delete all links starting from this note
  } catch (error) {
    console.log(error);
  }
}

/**
 * Update information of a note data according to the new label
 * @param noteId
 * @param props - update properties
 */
export async function updateNote(noteId: string, props: Note) {
  try {
    const oldPath = props.path;
    const ext = await extname(oldPath);
    try {
      await extname(props.label); // if the label has extension, do nothing
    } catch (error) {
      props.label += `.${ext}`; // if not, add extension to the end
    }
    const splits = props._id.split("/");
    splits[splits.length - 1] = props.label;
    props._id = splits.join("/");
    props.path = IdToPath(props._id);

    await renameFile(oldPath, props.path);

    // update db
    // update note in notes store
    await idb.delete("notes", noteId);
    await idb.put("notes", { noteId: props._id });
    // replace all related links in other markdown files and update indexeddb
    await batchReplaceLink(noteId, props._id);

    return props;
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
    const path = IdToPath(noteId);
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
 * Get all notes belong to specific project
 * @param projectId
 * @returns array of notes
 */
export async function getNotes(projectId: string): Promise<Note[]> {
  try {
    // TODO: support folders in project folder
    // see example of readDir in https://tauri.app/v1/api/js/fs/
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
    const entries = await readDir(await join(db.storagePath, projectId), {
      recursive: true,
    });
    await processEntries(entries);
    // sort by label
    return notes.sort((n1, n2) => (n1.label < n2.label ? -1 : 1));
  } catch (error) {
    console.log(error);
    return [];
  }
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
    return await readTextFile(notePath || note.path);
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
    const note = (await getNote(noteId)) as Note;
    await writeTextFile(notePath || note.path, content);
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
    // const imgFolder: string = await join(await dirname(note.path), "img");
    const imgFolder: string = await join(db.storagePath, ".sophosia", "image");
    const imgPath: string = await join(imgFolder, imgName);
    if (!(await exists(imgFolder))) await createDir(imgFolder);

    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    await writeBinaryFile(imgPath, Buffer.from(arrayBuffer));
    return { imgName: imgName, imgPath: imgName };
  } catch (error) {
    console.log(error);
  }
}
