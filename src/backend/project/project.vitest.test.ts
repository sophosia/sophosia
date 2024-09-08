import {
  addProject,
  createProject,
  deleteProject,
  getProject,
  getProjects,
  updateProject,
} from "src/backend/project";
import { mockFS } from "test/vitest/setup-file";
import { afterEach, describe, expect, it } from "vitest";
import { Project, db } from "../database";

afterEach(() => {
  mockFS.clear();
});

describe("project.ts", () => {
  it("createProject", () => {
    const category = "category";
    const project = createProject(category);
    expect(project.categories).toContain(category);
  });

  it("addProject", async () => {
    const category = "category";
    const project = createProject(category);
    await addProject(project);

    const projectPath = [db.config.storagePath, project._id].join("/");
    const projectNotePath = [projectPath, `${project._id}.md`].join("/");
    expect(mockFS.has(projectPath)).toBe(true);
    expect(mockFS.has(projectNotePath)).toBe(true);
  });

  it("deleteProject (deleteFromDB)", async () => {
    const category = "category";
    const project = createProject(category);
    await addProject(project);

    await deleteProject(project._id, true);

    const projectPath = [db.config.storagePath, project._id].join("/");
    expect(mockFS.has(projectPath)).toBe(false);
  });

  it("deleteProject (deleteFromFolder)", async () => {
    const category = "category";
    const project = createProject(category);
    await addProject(project);

    await deleteProject(project._id, false, category);
    const newProject = (await getProject(project._id)) as Project;

    const projectPath = [db.config.storagePath, project._id].join("/");
    expect(newProject.categories).not.toContain(category);
    expect(mockFS.has(projectPath)).toBe(true);
  });

  it("updateProject", async () => {
    const category = "category";
    const project = createProject(category);
    await addProject(project);

    const props = { title: "new_title" };
    await updateProject(project._id, props as Project);

    const newProject = (await getProject(project._id)) as Project;
    expect(newProject.title).toBe("new_title");
  });

  it("getProject", async () => {
    const category = "category";
    const project = createProject(category);
    await addProject(project);

    const newProject = await getProject(project._id);
    expect(newProject?.categories).toContain(category);
  });

  it("getProjects", async () => {
    const category = "category";
    for (let i = 0; i < 10; i++) await addProject(createProject(category));

    // console.log("mockFS", mockFS);
    const projects = await getProjects(category);
    expect(projects.length).toBe(10);
  });
});
