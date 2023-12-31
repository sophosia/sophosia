import { db, FolderOrNote, Project, SpecialFolder } from "../database";
import {
  copyFileToProjectFolder,
  createProjectFolder,
  deleteProjectFolder,
} from "./file";
import { extname, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";
import { exists, readDir, removeFile, renameFile } from "@tauri-apps/api/fs";
import { authorToString } from "./utils";
import { i18n } from "src/boot/i18n";
import { getNotes, getNoteTree, saveNote } from "./note";
import { generateCiteKey } from "./meta";
const { t } = i18n.global;

/**
 * Create a project data
 * @param folderId
 */
export function createProject(folderId: string) {
  // create empty project entry
  const project = {
    _id: `SP${db.nanoid}`,
    timestampAdded: Date.now(),
    timestampModified: Date.now(),
    dataType: "project",
    label: t("new", { type: t("project") }),
    title: t("new", { type: t("project") }),
    path: undefined,
    tags: [] as string[],
    folderIds: [SpecialFolder.LIBRARY.toString()],
    favorite: false,
    children: [] as FolderOrNote[],
  } as Project;
  if (folderId != SpecialFolder.LIBRARY.toString())
    project.folderIds.push(folderId);
  return project;
}

/**
 * Add empty projet to database, creates project folder and returns the project
 * The project is added to folder with folderId
 * @param project
 * @returns project
 */
export async function addProject(
  project: Project
): Promise<Project | undefined> {
  try {
    // need to remomve _graph property if update by meta
    delete project._graph;

    // create actual folder for containing its files
    await createProjectFolder(project);

    // put entry to database
    await db.put(project);
    return project; // return the project
  } catch (err) {
    console.log(err);
  }
}

/**
 * Delete project from a folder.
 * If deleteFromDB is true, delete the project from all folders
 * and remove the actual folder containing the project files in storage path
 * @param {string} projectId
 * @param {boolean} deleteFromDB
 * @param {string} folderId - if deleteFromDB === false, then we need folderId
 */
export async function deleteProject(
  projectId: string,
  deleteFromDB: boolean,
  folderId?: string
) {
  try {
    const project = (await db.get(projectId)) as Project;
    if (deleteFromDB) {
      // remove project and its related pdfState, pdfAnnotation and notes on db
      for (let dataType of ["pdfState", "pdfAnnotation", "project"]) {
        const docs = await db.getDocs(dataType);
        for (const doc of docs) if (doc._id === projectId) await db.remove(doc);
      }

      // remove the acutual files
      await deleteProjectFolder(projectId);
    } else {
      if (folderId === undefined) throw new Error("folderId is needed");
      project.folderIds = project.folderIds.filter((id) => id != folderId);
      await db.put(project);
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Update project in database and returns the updated project
 * @param project
 * @returns updated project
 */
export async function updateProject(
  projectId: string,
  props: Project
): Promise<Project | undefined> {
  try {
    const project = (await getProject(projectId, {
      includeNotes: true,
      includePDF: true,
    })) as Project;
    const notes = project.children;
    const path = project.path;
    Object.assign(project, props);
    project.label = project.title; // also update label
    project.timestampModified = Date.now();
    delete project._graph; // remomve _graph property if update by meta
    delete project.path; // no need to save path
    project.children = []; // no need to save notes
    await db.put(project);

    // update folder note as well
    const content = `
# ${project.label}
${t("author")}: ${authorToString(project.author)}
${t("abstract")}: ${project.abstract || ""}

${t("note-is-auto-manged")}`;
    await saveNote(`${projectId}/${projectId}.md`, content);
    // add these back since the vue components need this
    project.children = notes;
    project.path = path;
    return project;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get project from database by projectId
 * @param projectId
 * @param options
 * @returns Project
 */
export async function getProject(
  projectId: string,
  options?: { includePDF?: boolean; includeNotes?: boolean }
): Promise<Project | undefined> {
  try {
    const project = (await db.get(projectId)) as Project;
    if (options?.includePDF) project.path = await getPDF(projectId);
    if (options?.includeNotes) project.children = await getNoteTree(projectId);
    return project;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get all projects from database
 * @param options
 * @returns {Project[]} array of projects
 */
export async function getAllProjects(options?: {
  includePDF?: boolean;
  includeNotes?: boolean;
}): Promise<Project[]> {
  const projects = (await db.getDocs("project")) as Project[];
  for (const project of projects) {
    if (options?.includePDF) project.path = await getPDF(project._id);
    if (options?.includeNotes) project.children = await getNotes(project._id);
  }
  return projects;
}

/**
 * Get corresponding projects given the ID of folder containing them
 * @param folderId
 * @param options
 * @returns array of projects
 */
export async function getProjects(
  folderId: string,
  options?: { includePDF?: boolean; includeNotes?: boolean }
): Promise<Project[]> {
  try {
    let projects = [] as Project[];
    switch (folderId) {
      case SpecialFolder.LIBRARY:
        projects = (await db.getDocs("project")) as Project[];
        break;
      case SpecialFolder.ADDED:
        const date = new Date();
        // get recently added project in the last 30 days
        const timestamp = date.setDate(date.getDate() - 30);
        projects = (await db.getDocs("project")) as Project[];
        projects = projects.filter(
          (project) => project.timestampAdded > timestamp
        );
        // sort projects in descending order
        projects.sort((a, b) => b.timestampAdded - a.timestampAdded);
        break;
      case SpecialFolder.FAVORITES:
        projects = (await db.getDocs("project")) as Project[];
        projects = projects.filter((project) => project.favorite);
        break;
      default:
        projects = (await db.getDocs("project")) as Project[];
        projects = projects.filter((project) =>
          project.folderIds.includes(folderId)
        );
        break;
    }

    for (const project of projects) {
      if (options?.includePDF) project.path = await getPDF(project._id);
      if (options?.includeNotes)
        project.children = await getNoteTree(project._id);
    }

    return projects;
  } catch (error) {
    console.log(error);
    return [];
  }
}

/**
 * Rename the PDF file and then return the new path
 * @param project
 * @returns newPath
 */
export async function renamePDF(project: Project) {
  if (project.path === undefined) return;
  const oldPath = project.path;
  const fileName = generateCiteKey(project, undefined, true) + ".pdf";
  const newPath = await join(db.storagePath, project._id, fileName);
  await renameFile(oldPath, newPath);
  return newPath;
}

/**
 * Attach a PDF file and returns the new relative path to file
 * @param projectId
 */
export async function attachPDF(
  projectId: string
): Promise<string | undefined> {
  const filePath = await open({
    multiple: false,
    filters: [{ name: "*.pdf", extensions: ["pdf"] }],
  });

  if (typeof filePath !== "string") return;
  const oldPDFPath = await getPDF(projectId);
  if (oldPDFPath) await removeFile(oldPDFPath);
  return await copyFileToProjectFolder(filePath, projectId);
}

/**
 * Return the path of the pdf of a project
 * @param projectId
 */
export async function getPDF(projectId: string) {
  try {
    const projectFolder = await join(db.storagePath, projectId);
    const entries = await readDir(projectFolder);
    for (const entry of entries) {
      try {
        if ((await extname(entry.path)) === "pdf") return entry.path;
      } catch (error) {}
    }
  } catch (error) {
    console.log(error);
  }
}
