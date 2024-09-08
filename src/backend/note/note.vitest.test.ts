import { describe, it, expect } from "vitest";
import { Note, NoteType } from "src/backend/database";
import {
  createNote,
  addNote,
  deleteNote,
  getNotes,
  getAllNoteIds,
  loadNote,
  saveNote,
} from "src/backend/note";
import { mockFS } from "app/test/vitest/setup-file";
import { mockTable } from "app/test/vitest/mock-sqlite";

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
    expect(mockTable.length).toBe(0);
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

  it("getAllNotes", async () => {
    mockTable.length = 0;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const note = await createNote("projectId" + i, NoteType.MARKDOWN);
      await addNote(note);
    }
    const noteIds = await getAllNoteIds();
    expect(noteIds.length).toBe(n);
  });

  it("save & load note", async () => {
    await saveNote("noteId", "test content");
    const content = await loadNote("noteId");
    expect(content).toBe("test content");
  });
});
