import { describe, it, expect, afterEach } from "vitest";
import {
  createProject,
  addProject,
  deleteProject,
  updateProject,
  getProject,
  getProjects,
} from "src/backend/project/project";
import { Project } from "../database";
import { mockFS } from "test/vitest/setup-file";
import { db } from "../database";

afterEach(() => {
  mockFS.clear();
});

describe("project.ts", () => {
  it("createProject", () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    expect(project.folderIds).toContain(folderId);
  });

  it("addProject", async () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    await addProject(project);

    const projectPath = [db.config.storagePath, project._id].join("/");
    const projectNotePath = [projectPath, `${project._id}.md`].join("/");
    expect(mockFS.has(projectPath)).toBe(true);
    expect(mockFS.has(projectNotePath)).toBe(true);
  });

  it("deleteProject (deleteFromDB)", async () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    await addProject(project);

    await deleteProject(project._id, true);

    const projectPath = [db.config.storagePath, project._id].join("/");
    expect(mockFS.has(projectPath)).toBe(false);
  });

  it("deleteProject (deleteFromFolder)", async () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    await addProject(project);

    await deleteProject(project._id, false, folderId);
    const newProject = (await getProject(project._id)) as Project;

    const projectPath = [db.config.storagePath, project._id].join("/");
    expect(newProject.folderIds).not.toContain(folderId);
    expect(mockFS.has(projectPath)).toBe(true);
  });

  it("updateProject", async () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    await addProject(project);

    const props = { title: "new_title" };
    await updateProject(project._id, props as Project);

    const newProject = (await getProject(project._id)) as Project;
    expect(newProject.title).toBe("new_title");
  });

  it("getProject", async () => {
    const folderId = "folderId";
    const project = createProject(folderId);
    await addProject(project);

    const newProject = await getProject(project._id);
    expect(newProject?.folderIds).toContain(folderId);
  });

  it("getProjects", async () => {
    const folderId = "folderId";
    for (let i = 0; i < 10; i++) await addProject(createProject(folderId));

    const projects = await getProjects(folderId);
    expect(projects.length).toBe(10);
  });
});
