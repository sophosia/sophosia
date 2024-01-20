import { describe, it, expect } from "vitest";
import { Note, NoteType } from "src/backend/database";
import {
  createNote,
  addNote,
  deleteNote,
  getNotes,
  getNoteTree,
  getAllNotes,
  loadNote,
  saveNote,
} from "src/backend/project/note";
import { mockFS } from "app/test/vitest/setup-file";

describe("note.ts", () => {
  it("createNote", async () => {
    const type = NoteType.MARKDOWN;
    const projectId = "projectId";
    const note = await createNote(projectId, type);
    expect(note.type).toBe(type);
    expect(note.projectId).toBe(projectId);
  });

  it("deleteNote", async () => {
    const projectId = "projectId";
    const note = await createNote(projectId, NoteType.MARKDOWN);
    await addNote(note);
    await deleteNote(note._id);

    expect(mockFS.has(note.path)).toBe(false);
  });

  it("getNotes", async () => {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const note = await createNote("projectId", NoteType.MARKDOWN);
      await addNote(note);
    }
    const notes = (await getNotes("projectId")) as Note[];
    expect(notes.length).toBe(n);
  });
});
