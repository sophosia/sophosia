import { db, Note, NoteType } from "../database";
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
import { join, extname, basename } from "@tauri-apps/api/path";

/**
 * Create a note
 * @param projectId
 * @param type
 */
export async function createNote(projectId: string, type: NoteType) {
  const extension = type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  let i = 1;
  let label = "Untitled";
  let path = await join(db.storagePath, projectId, label + extension);
  while (await exists(path)) {
    label = `Untitled ${i}`;
    path = await join(db.storagePath, projectId, label + extension);
    i++;
  }

  const note = {
    _id: `${projectId}/${label}`,
    timestampAdded: Date.now(),
    timestampModified: Date.now(),
    dataType: "note",
    projectId: projectId,
    label: label,
    path: path,
    type: type,
    links: [],
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
    const extension = note.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
    note.path = (await createFile(
      note.projectId,
      note.label + extension
    )) as string;

    // add to db
    // await db.put(note);
    return note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a note from database and from disk
 * @param noteId
 */
export async function deleteNote(note: Note) {
  try {
    // delete note entry from db
    // const note = (await getNote(noteId)) as Note;
    // await db.remove(note);

    // delete actual file
    await deleteFile(note.path);
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
    const extension =
      props.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
    const oldPath = props.path;
    props.path = await join(
      db.storagePath,
      props.projectId,
      props.label + extension
    );
    await renameFile(oldPath, props.path);
    props._id = `${props.projectId}/${props.label}`;
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
    const [projectId, label] = noteId.split("/");
    const splitLabel = label.split(".");
    const ext =
      splitLabel.length > 1 ? splitLabel[splitLabel.length - 1] : "md";
    const note = {
      _id: noteId,
      timestampAdded: Date.now(),
      timestampModified: Date.now(),
      dataType: "note",
      projectId: projectId,
      label: label,
      path: await join(db.storagePath, projectId, label + `.${ext}`),
      type: ext === "excalidraw" ? NoteType.EXCALIDRAW : NoteType.MARKDOWN,
      links: [],
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
    // let notes = (await db.getDocs("note")) as Note[];
    // return notes.filter((note) => note.projectId === projectId);
    // TODO: support folders in project folder
    // see example of readDir in https://tauri.app/v1/api/js/fs/
    const notes = [] as Note[];
    const files = await readDir(await join(db.storagePath, projectId), {
      recursive: false,
    });
    for (const file of files) {
      let ext = await extname(file.path);
      let label = await basename(file.path, "." + ext);
      if (!["excalidraw", "md"].includes(ext)) continue;
      notes.push({
        _id: `${projectId}/${label}`,
        timestampAdded: Date.now(),
        timestampModified: Date.now(),
        dataType: "note",
        projectId: projectId,
        label: label,
        path: file.path,
        type: ext === "excalidraw" ? NoteType.EXCALIDRAW : NoteType.MARKDOWN,
        links: [],
      } as Note);
    }
    // sort by label
    return notes.sort((n1, n2) => (n1.label < n2.label ? -1 : 1));
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
