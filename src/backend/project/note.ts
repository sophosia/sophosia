import { db, Note, NoteType } from "../database";
import { uid } from "quasar";
import { Buffer } from "buffer";
import { createFile, deleteFile } from "./file";
import {
  exists,
  createDir,
  readTextFile,
  writeTextFile,
  writeBinaryFile,
} from "@tauri-apps/api/fs";
import { join, extname, dirname } from "@tauri-apps/api/path";

/**
 * Create a note
 * @param projectId
 * @param type
 */
export function createNote(projectId: string, type: NoteType) {
  return {
    _id: uid(),
    _rev: "",
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
    const result = await db.put(note);
    note._rev = result.rev;
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
    props._rev = note._rev;
    props.timestampModified = Date.now();
    Object.assign(note, props);
    const result = await db.put(note);
    note._rev = result.rev;
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
    return await db.get(noteId);
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
    const notes = (
      await db.find({
        selector: {
          dataType: "note",
          projectId: projectId,
        },
      })
    ).docs as Note[];

    // TODO: remove this few more versions later
    let flag = false;
    for (const note of notes)
      if (!note.timestampAdded) {
        note.timestampAdded = Date.now();
        note.timestampModified = Date.now();
        flag = true;
      }
    if (flag) {
      const responses = await db.bulkDocs(notes);
      for (const i in responses) {
        const rev = responses[i].rev;
        if (rev) notes[i]._rev = rev;
      }
    }

    return notes as Note[];
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
  const result = await db.find({
    selector: {
      dataType: "note",
    },
  });

  return result.docs as Note[];
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
    const note: Note = await db.get(noteId);
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
    const note: Note = await db.get(noteId);
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
    const note: Note = await db.get(noteId);
    const imgType: string = await extname(file.name); // .png
    const imgName: string = uid() + imgType; // use uuid as img name
    const imgFolder: string = await join(await dirname(note.path), "img");
    const imgPath: string = await join(imgFolder, imgName);
    if (!(await exists(imgFolder))) await createDir(imgFolder);

    const arrayBuffer: ArrayBuffer = await file.arrayBuffer();
    await writeBinaryFile(imgPath, Buffer.from(arrayBuffer));
    return { imgName: imgName, imgPath: imgPath };
  } catch (error) {
    console.log(error);
  }
}
