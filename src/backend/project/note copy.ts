import { db, Note, NoteType } from "../database";
import { Buffer } from "buffer";
import { createFile, deleteFile } from "./file";
import {
  exists,
  createDir,
  readTextFile,
  writeTextFile,
  writeBinaryFile,
} from "@tauri-apps/api/fs";
import { join, extname } from "@tauri-apps/api/path";

/**
 * Create a note
 * @param projectId
 * @param type
 */
export function createNote(projectId: string, type: NoteType) {
  return {
    _id: `SN${db.nanoid}`,
    timestampAdded: Date.now(),
    timestampModified: Date.now(),
    dataType: "note",
    projectId: projectId,
    label: "New Note",
    path: "",
    type: type,
    links: [],
  } as Note;
}

/**
 * Add a note to database
 * and creates the actual markdown file in project folder
 * @param note
 * @returns updated note
 */
export async function addNote(note: Note): Promise<Note | undefined> {
  try {
    // create actual file
    const extension = note.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
    note.path = (await createFile(
      note.projectId,
      note._id + extension
    )) as string;

    // add to db
    await db.put(note);
    return note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a note from database and from disk
 * @param noteId
 */
export async function deleteNote(noteId: string) {
  try {
    // delete note entry from db
    const note = (await db.get(noteId)) as Note;
    await db.remove(note);

    // delete actual file
    await deleteFile(note.path);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Update information of a note in database
 * @param noteId
 * @param props - update properties
 */
export async function updateNote(noteId: string, props: Note) {
  try {
    const note = (await db.get(noteId)) as Note;
    props.timestampModified = Date.now();
    Object.assign(note, props);
    await db.put(note);
    return note;
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
    return (await db.get(noteId)) as Note;
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
    let notes = (await db.getDocs("note")) as Note[];
    return notes.filter((note) => note.projectId === projectId);
  } catch (error) {
    console.log(error);
    return [];
  }
}

/**
 * Get all notes in database
 * @returns {Note[]} array of notes
 */
export async function getAllNotes(): Promise<Note[]> {
  return (await db.getDocs("note")) as Note[];
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
    const note = (await db.get(noteId)) as Note;
    if (await exists(note.path)) return await readTextFile(note.path);
    else return "";
  } catch (error) {
    if ((error as Error).name == "not_found") {
      if (notePath) return await readTextFile(notePath);
      else {
        console.log("Error: Must have a valid noteId or notePath");
        return "";
      }
    }
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
    const note = (await db.get(noteId)) as Note;
    await writeTextFile(note.path, content);
  } catch (error) {
    if ((error as Error).name == "not_found") {
      // might be a note opened by plugin
      if (notePath) await writeTextFile(notePath, content);
      else console.log("Error: Must pass in a valid noteId or valid notePath");
    }
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
