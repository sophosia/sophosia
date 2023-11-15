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

/**
 * Create a note
 * @param projectId
 * @param type
 */
export async function createNote(projectId: string, type: NoteType) {
  let i = 1;
  let label = "Untitled.md";
  let path = await join(db.storagePath, projectId, label);
  while (await exists(path)) {
    label = `Untitled ${i}.md`;
    path = await join(db.storagePath, projectId, label);
    i++;
  }
  const noteId = pathToId(path);

  const note = {
    _id: noteId,
    dataType: "note",
    projectId: projectId,
    label: label,
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
    if (props.label.slice(-2) !== "md") props.label += ".md";
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
    // If it's a markdown note, then label does not contain .md
    // If it's a excalidraw note, then label does contain .excalidraw
    let completeNoteId = noteId.slice(-2) === "md" ? noteId : noteId + ".md";
    const splits = completeNoteId.split("/");
    const projectId = splits[0];
    const label = splits[splits.length - 1];
    const path = IdToPath(noteId);
    const note = {
      _id: completeNoteId,
      dataType: "note",
      projectId: projectId,
      label: label,
      path: path,
      type: NoteType.MARKDOWN,
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
          if ((await extname(entry.path)) !== "md") continue;

          const noteId = pathToId(entry.path);
          const splits = noteId.split("/");
          const projectId = splits[0];
          const label = splits[splits.length - 1];
          notes.push({
            _id: noteId,
            dataType: "note",
            projectId: projectId,
            label: label,
            path: entry.path,
            type: NoteType.MARKDOWN,
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
  noteId: string,
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
