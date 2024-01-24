import { db, FolderOrNote, Project, SpecialFolder } from "../database";
import {
  copyFileToProjectFolder,
  createProjectFolder,
  deleteProjectFolder
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
 * Initializes a new project in a specified folder.
 *
 * @param {string} folderId - The folder ID where the project is created.
 * @returns {Project} The newly created project object.
 *
 * Generates a project with a unique ID and default properties.
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
    children: [] as FolderOrNote[]
  } as Project;
  if (folderId != SpecialFolder.LIBRARY.toString())
    project.folderIds.push(folderId);
  return project;
}

/**
 * Adds a new project to the database and creates its associated folder.
 *
 * @param {Project} project - The project to be added.
 * @returns {Promise<Project | undefined>} The added project or undefined if an error occurs.
 *
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
 * Updates the properties of an existing project in the database.
 *
 * @param {string} projectId - The ID of the project to update.
 * @param {Project} props - An object with properties to update in the project.
 * @returns {Promise<Project | undefined>} The updated project or undefined if an error occurs.
 *
 */
export async function updateProject(
  projectId: string,
  props: Project
): Promise<Project | undefined> {
  try {
    const project = (await getProject(projectId, {
      includeNotes: true,
      includePDF: true
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
 * Retrieves a project from the database with optional inclusion of associated PDFs and notes.
 *
 * @param {string} projectId - The ID of the project to retrieve.
 * @param {Object} [options] - Options to include PDFs and/or notes in the project data.
 * @returns {Promise<Project | undefined>} The project with the specified ID, or undefined if not found or on error.
 *
 * Fetches the project and optionally attaches its associated PDF and note tree based on the provided options.
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
 * Retrieves all projects from the database, with options to include related PDFs and notes.
 *
 * @param {Object} [options] - Options to include associated PDFs and/or notes for each project.
 * @returns {Promise<Project[]>} A promise resolving to an array of Project objects.
 *
 * Iterates through all projects in the database, optionally attaching their associated PDF paths and note trees
 * based on the specified options.
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
 * Retrieves projects from a specific folder, with options to include related PDFs and notes.
 *
 * @param {string} folderId - The ID of the folder to filter projects by.
 * @param {Object} [options] - Options to include associated PDFs and/or notes for each project.
 * @returns {Promise<Project[]>} A promise resolving to an array of Project objects filtered by the folder ID.
 *
 * Fetches projects based on the specified folder ID, applying additional filters for special folders like Library, Added, and Favorites.
 * Optionally attaches associated PDF paths and note trees for each project based on provided options.
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
 * Renames the PDF file associated with a project based on a generated citation key.
 *
 * @param {Project} project - The project whose associated PDF needs renaming.
 * @returns {Promise<string | undefined>} The new path of the renamed PDF file or undefined if the project has no associated path.
 *
 * Generates a new filename using the citation key and moves the PDF file to this new path.
 */
export async function renamePDF(project: Project) {
  if (project.path === undefined) return;
  const oldPath = project.path;
  const fileName = generateCiteKey(project, undefined, true) + ".pdf";
  const newPath = await join(db.config.storagePath, project._id, fileName);
  await renameFile(oldPath, newPath);
  return newPath;
}

/**
 * Attaches a PDF file to a project by copying it to the project's folder.
 *
 * @param {string} projectId - The ID of the project to attach the PDF to.
 * @returns {Promise<string | undefined>} The path of the copied PDF file in the project's folder, or undefined if no file is selected.
 *
 * Opens a file dialog to select a PDF, removes any existing PDF associated with the project, and copies the selected PDF to the project's folder.
 */
export async function attachPDF(
  projectId: string
): Promise<string | undefined> {
  const filePath = await open({
    multiple: false,
    filters: [{ name: "*.pdf", extensions: ["pdf"] }]
  });

  if (typeof filePath !== "string") return;
  const oldPDFPath = await getPDF(projectId);
  if (oldPDFPath) await removeFile(oldPDFPath);
  return await copyFileToProjectFolder(filePath, projectId);
}

/**
 * Retrieve the path of the first PDF file found within a project folder.
 *
 * @param {string} projectId - The unique identifier of the project.
 * @returns {Promise<string | undefined>} The path of the first PDF file found, or undefined if no PDF is found or an error occurs.
 */
export async function getPDF(projectId: string) {
  try {
    const projectFolder = await join(db.config.storagePath, projectId);
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
