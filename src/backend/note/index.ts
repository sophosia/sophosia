import { sqldb, db, FolderOrNote, Note, NoteType } from "../database";
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
import { join, extname, basename } from "@tauri-apps/api/path";
import type { FileEntry } from "@tauri-apps/api/fs";
import { processEntries } from "../indexer";
import { metadata } from "tauri-plugin-fs-extra-api";
import { idToLink, idToPath, pathToId } from "../utils";
import { i18n } from "src/boot/i18n";
import { ref } from "vue";
const { t } = i18n.global;

export const isLinkUpdated = ref(false); // to notify the reloading of note editor

/**
 * Creates a new note with a unique name in the specified folder.
 *
 * @param {string} folderId - The ID of the folder where the note will be created.
 * @param {NoteType} type - The type of note (Markdown or Excalidraw).
 * @returns {Promise<Note>} A promise that resolves to the newly created note object.
 *
 * Generates a note file path, ensuring no naming conflicts. Constructs and returns a note object.
 */
export async function createNote(
  folderId: string,
  type: NoteType
): Promise<Note> {
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
 * Adds a note to the database and creates its file.
 *
 * @param {Note} note - The note to add.
 * @returns {Promise<Note | undefined>} The added note or undefined if failed.
 *
 * @throws Logs an error on failure.
 */
export async function addNote(note: Note): Promise<Note | undefined> {
  try {
    // create actual file
    await writeTextFile(idToPath(note._id), "");

    // add to db
    const meta = await metadata(idToPath(note._id));
    const props = Object.assign(note, {
      timestampAdded: meta.createdAt.getTime(),
      timestampModified: meta.modifiedAt.getTime(),
      content: "",
    });
    insertOrUpdateNote(note._id, props);
    return note;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Insert or update a note in notes table
 *
 * @async
 * @param {string} noteId - the original noteId
 * @param {Note & {
    content: string;
    timestampAdded: number;
    timestampModified: number;
  }} props - new properties of the note
 */
async function insertOrUpdateNote(
  noteId: string,
  props: Note & {
    content: string;
    timestampAdded: number;
    timestampModified: number;
  }
) {
  await sqldb.execute("DELETE FROM notes WHERE _id = $1", [noteId]);
  await sqldb.execute(
    `INSERT INTO notes (projectId, _id, type, content, timestampAdded, timestampModified)
VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      props.projectId,
      props._id,
      props.type,
      props.content,
      props.timestampAdded,
      props.timestampModified,
    ]
  );
}

/**
 * Deletes a note and its associated links from the database and file system.
 *
 * @param {string} noteId - The ID of the note to be deleted.
 *
 * Removes the note file and its entry from the database, along with any links starting from this note.
 *
 * @throws Logs an error if the deletion process encounters any issues.
 */
export async function deleteNote(noteId: string) {
  try {
    await removeFile(idToPath(noteId));

    // update db
    removeNoteAndLinks(noteId);
  } catch (error) {
    console.log(error);
  }
}

async function removeNoteAndLinks(noteId: string) {
  await sqldb.execute("DELETE FROM notes WHERE _id = $1", [noteId]);
  await sqldb.execute("DELETE FROM links WHERE source = $1 OR target = $1", [
    noteId,
  ]);
}

/**
 * Renames a note and updates its references in the database and file system.
 *
 * @param {string} oldNoteId - The current ID of the note to be renamed.
 * @param {string} newNoteId - The new ID for the note.
 * @returns {Promise<Note | undefined>} A promise resolving to the updated note object or undefined on error.
 *
 * Renames the note file and updates its ID in the database. Also updates any related links.
 * Handles the addition of file extensions if not present in the new name.
 *
 * @throws Logs an error if the renaming process fails.
 */
export async function renameNote(
  oldNoteId: string,
  newNoteId: string
): Promise<Note | undefined> {
  try {
    const oldPath = idToPath(oldNoteId);
    const ext = await extname(oldPath);
    if (!newNoteId.endsWith(`.${ext}`)) newNoteId += `.${ext}`;
    const newPath = idToPath(newNoteId);

    await renameFile(oldPath, newPath);

    // replace all related links in other markdown files
    // and update related rows in sqldb
    await batchReplaceLink(oldNoteId, newNoteId);
    // udpate links in links table
    await sqldb.execute(
      `
UPDATE links
SET source = CASE
  WHEN source = $1 THEN $2
  ELSE source
END,
SET target = CASE
  WHEN target = $1 THEN $2
  ELSE target
END
WHERE source = $1 OR target = $2
`,
      [oldNoteId, newNoteId]
    );

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
 * Retrieves a note by its ID.
 *
 * @param {string} noteId - The ID of the note to retrieve.
 * @returns {Promise<Note | undefined>} A promise resolving to the note object or undefined if not found or on error.
 *
 * Constructs a note object from the given ID, including its type based on the file extension.
 *
 * @throws Logs an error if the retrieval process encounters any issues.
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
 * Retrieves all notes within a specified folder.
 *
 * @param {string} folderId - The ID of the folder to search for notes.
 * @returns {Promise<Note[]>} A promise resolving to an array of Note objects.
 *
 * Recursively searches the folder and its subfolders for note files, constructs Note objects for each,
 * and returns a sorted array of these notes.
 *
 * @throws Logs an error and returns an empty array if an error occurs during the search process.
 */
export async function getNotes(folderId: string): Promise<Note[]> {
  try {
    const notes = [] as Note[];
    let results =
      (await sqldb.select<{ _id: string }[]>(
        "SELECT _id FROM notes WHERE _id LIKE '$1%'",
        [folderId]
      )) || [];

    if (results.length > 0) {
      for (const result of results)
        notes.push((await getNote(result._id)) as Note);
      return notes;
    }

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
 * Generates a tree structure of notes and folders for a given project.
 *
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<FolderOrNote[]>} A promise resolving to an array representing the tree structure.
 *
 * Recursively traverses through folders and notes, constructing a hierarchical tree structure.
 * Skips non-note files and the project's main note.
 */
export async function getNoteTree(projectId: string): Promise<FolderOrNote[]> {
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
 * Get all noteIds in database
 * @returns {string[]} noteIds - array of noteId
 */
export async function getAllNoteIds(): Promise<string[]> {
  const results =
    (await sqldb.select<{ _id: string }[]>("SELECT _id FROM notes")) || [];
  return results.map((result) => result._id);
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
    const result =
      (await sqldb.select<{ content: string }[]>(
        "SELECT content FROM notes WHERE _id = $1",
        [noteId]
      )) || [];
    if (result.length > 0) return result[0].content;
    else return await readTextFile(notePath || idToPath(noteId));
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
    sqldb.execute("UPDATE notes SET content = $1 WHERE _id = $2", [
      content,
      noteId,
    ]);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Upload image and save it under the project folder
 * If /img doesn't exist, it will create this folder
 * @param {File} file
 */
export async function uploadImage(
  file: File
): Promise<{ imgName: string; imgPath: string } | undefined> {
  if (!file.type.includes("image")) return;

  try {
    const imgType: string = await extname(file.name); // png
    const imgName = `SI${db.nanoid}.${imgType}`; // use nanoid as img name
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

/**
 * Creates a new folder within a specified parent folder.
 *
 * @param {string} parentFolderId - The ID of the parent folder.
 * @returns {Promise<FolderOrNote>} A promise resolving to the newly created folder object.
 *
 * Generates a unique name for the new folder and creates it under the parent folder.
 * Returns the folder object with its properties.
 */
export async function createFolder(
  parentFolderId: string
): Promise<FolderOrNote> {
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

/**
 * Adds a new folder to the file system based on the provided folder object.
 *
 * @param {FolderOrNote} folder - The folder object to be added.
 *
 * Creates a directory in the file system using the folder's ID as the path.
 *
 * @throws Logs an error if the folder creation process fails.
 */
export async function addFolder(folder: FolderOrNote) {
  try {
    await createDir(idToPath(folder._id));
  } catch (error) {
    console.log(error);
  }
}

/**
 * Deletes a folder and its contents from the file system and database.
 *
 * @param {string} folderId - The ID of the folder to be deleted.
 *
 * First removes all notes within the folder from the indexed database, along with any associated links.
 * Then deletes the folder itself from the file system, including all files within it.
 *
 * @throws Logs an error if the deletion process encounters any issues.
 */
export async function deleteFolder(folderId: string) {
  try {
    // remove notes from sqldb first
    const notes = await getNotes(folderId);
    const noteIds = notes.map((note) => note._id);

    const placeholders = noteIds.map((_, index) => `$${index + 1}`).join(", ");
    sqldb.execute(`DELETE FROM notes WHERE _id IN (${placeholders})`, noteIds);
    sqldb.execute(
      `DELETE FROM links WHERE source IN ($${placeholders}) OR target IN ($${placeholders})`,
      noteIds
    );

    // remove the actual folder
    await removeDir(idToPath(folderId), { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Renames a folder and updates references in the database.
 *
 * @param {string} oldFolderId - The current ID of the folder to be renamed.
 * @param {string} newFolderId - The new ID for the folder.
 *
 * Updates the IDs of all notes within the folder in the database, adjusts any related links,
 * and then renames the folder in the file system.
 *
 * @throws Logs an error if the renaming process encounters any issues.
 */
export async function renameFolder(oldFolderId: string, newFolderId: string) {
  try {
    // update sqldb
    const notes = await getNotes(oldFolderId);
    sqldb.execute("UPDATE notes SET _id = REPLACE(_id, $1, $2)", [
      oldFolderId,
      newFolderId,
    ]);

    for (const note of notes) {
      const newNoteId = note._id.replace(oldFolderId, newFolderId);
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

/**
 * Replace all associated links in all markdown notes if a note is renamed
 * @param oldNoteId
 * @param newNoteId
 */
export async function batchReplaceLink(oldNoteId: string, newNoteId: string) {
  await sqldb.execute("UPDATE notes SET _id = $1 WHERE _id = $2", [
    newNoteId,
    oldNoteId,
  ]);
  const entries = await readDir(db.config.storagePath, { recursive: true });
  await processEntries(entries, async (file: FileEntry) => {
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

      sqldb &&
        (await sqldb.execute("UPDATE notes SET content = $1 WHERE _id = $2", [
          newContent,
          pathToId(file.path),
        ]));
    }
  });
}
