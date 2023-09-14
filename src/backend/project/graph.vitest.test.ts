import { describe, it, expect, beforeAll } from "vitest";
import { createNote, addNote, getNote } from "./note";
import { createProject, addProject } from "./project";
import { Note, NoteType, Project } from "../database";
import { getLinks, getParents } from "./graph";

describe("graph.ts", () => {
  /**
   * The graph here is
   * note0 -> note1 -> note2
   */
  beforeAll(async () => {
    const projects = [] as Project[];
    for (let i = 0; i < 3; i++) {
      const project = createProject("testFolder");
      project.title = `project${i}`;
      project.label = `project${i}`;
      projects.push((await addProject(project)) as Project);
    }
    const note2 = createNote(projects[2]._id, NoteType.MARKDOWN);
    note2._id = "note2";
    note2.label = "note2";
    await addNote(note2);

    const note1 = createNote(projects[1]._id, NoteType.MARKDOWN);
    note1._id = "note1";
    note1.label = "note1";
    note1.links.push({
      id: note2._id,
      label: note2.label,
      type: undefined,
    });
    await addNote(note1);

    const note0 = createNote(projects[0]._id, NoteType.MARKDOWN);
    note0._id = "note0";
    note0.label = "note0";
    note0.links.push({
      id: note1._id,
      label: note1.label,
      type: undefined,
    });
    await addNote(note0);
  });

  it("getLinks", async () => {
    const note = (await getNote("note1")) as Note;
    const elements = await getLinks(note);
    console.log(elements.nodes);
    console.log(elements.edges);
    expect(elements.nodes).toHaveLength(3);
    expect(elements.edges).toHaveLength(2);
  });

  it("getParents", async () => {
    const note = (await getNote("note1")) as Note;
    const elements = await getLinks(note);

    const parentNodes = await getParents(elements.nodes);
    expect(parentNodes).toHaveLength(3);
  });
});
