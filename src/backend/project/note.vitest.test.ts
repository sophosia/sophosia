import { describe, it, expect } from "vitest";
import { Note, NoteType } from "src/backend/database";
import {
  createNote,
  addNote,
  deleteNote,
  updateNote,
  getNote,
  getNotes
} from "src/backend/project/note";

describe("note.ts", () => {
  it("createNote", async () => {
    const type = NoteType.MARKDOWN;
    const projectId = "test-id";
    const note = createNote(projectId, type);
    expect(note.type).toBe(type);
    expect(note.projectId).toBe(projectId);
  });

  it("deleteNote", async () => {
    const note = createNote("", NoteType.MARKDOWN);
    await addNote(note);
    await deleteNote(note._id);

    const result = await getNote(note._id);
    expect(result).toBe(undefined);
  });

  it("updateNote", async () => {
    const note = createNote("", NoteType.MARKDOWN);
    const n = (await addNote(note)) as Note;
    n.label = "test note";
    const nn = (await updateNote(n._id, n)) as Note;
    expect(nn.label).toBe(n.label);
  });

  it("getNotes", async () => {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const note = createNote("projectId", NoteType.MARKDOWN);
      await addNote(note);
    }
    const notes = (await getNotes("projectId")) as Note[];
    expect(notes.length).toBe(n);
  });
});
