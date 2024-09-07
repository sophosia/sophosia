import { beforeAll, describe, expect, it } from "vitest";
import { Note, NoteType, Project } from "../database";
import { getGraph, updateForwardLinks } from "./index";
import { addNote, createNote } from "../note";
import { addProject, createProject } from "../project";

const notes = [] as Note[];
const projects = [] as Project[];
describe("graph.ts", () => {
  /**
   * The graph here is
   * note0 -> note1 -> note2
   */
  beforeAll(async () => {
    for (let i = 0; i < 3; i++) {
      const project = createProject("testFolder");
      project.title = `project${i}`;
      project.label = `project${i}`;
      projects.push((await addProject(project)) as Project);
    }
    const note2 = await createNote(projects[2]._id, NoteType.MARKDOWN);
    notes.push((await addNote(note2)) as Note);

    const note1 = await createNote(projects[1]._id, NoteType.MARKDOWN);
    notes.push((await addNote(note1)) as Note);
    await updateForwardLinks(note1._id, [note2._id]);

    const note0 = await createNote(projects[0]._id, NoteType.MARKDOWN);
    notes.push((await addNote(note0)) as Note);
    await updateForwardLinks(note0._id, [note1._id]);
  });

  it("getGraph", async () => {
    // get graph
    const { nodes, edges } = await getGraph(notes[1]._id);
    // should have num of nodes = num of notes and their parents
    expect(nodes.length).toBe(projects.length + notes.length);
    expect(edges.length).toBe(2);
  });
});
