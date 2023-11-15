import { db, Note, Project, SpecialFolder } from "../database";
import {
  copyFileToProjectFolder,
  createProjectFolder,
  deleteProjectFolder,
} from "./file";
import { basename, extname } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";
import { renameFile } from "@tauri-apps/api/fs";
import { IdToPath } from "./utils";

/**
 * Create a project data
 * @param folderId
 */
export function createProject(folderId: string) {
  // create empty project entry
  const projectId = `SP${db.nanoid}`;
  const noteLabel = "Overview.md";
  const noteId = `${projectId}/${projectId}.md`;
  const notePath = IdToPath(noteId);
  const project = {
    _id: projectId,
    timestampAdded: Date.now(),
    timestampModified: Date.now(),
    dataType: "project",
    label: "New Project",
    title: "New Project",
    path: "",
    tags: [] as string[],
    folderIds: [SpecialFolder.LIBRARY.toString()],
    favorite: false,
    children: [
      {
        _id: noteId,
        dataType: "note",
        projectId: projectId,
        label: noteLabel,
        path: notePath,
        type: "markdown",
      } as Note,
    ],
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
      // (do not rely on project.path because it might be empty)
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
    // need to remomve _graph property if update by meta
    delete props._graph;
    const project = (await db.get(projectId)) as Project;
    props.timestampModified = Date.now();
    Object.assign(project, props);
    project.label = project.title; // also update label
    await db.put(project);
    return project;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get project from database by projectId
 * @param {string} projectId
 * @returns {Project|undefined} project
 */
export async function getProject(
  projectId: string
): Promise<Project | undefined> {
  try {
    return (await db.get(projectId)) as Project;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get all projects from database
 * @returns {Project[]} array of projects
 */
export async function getAllProjects(): Promise<Project[]> {
  return (await db.getDocs("project")) as Project[];
}

/**
 * Get corresponding projects given the ID of folder containing them
 * @param folderId
 * @returns array of projects
 */
export async function getProjects(folderId: string): Promise<Project[]> {
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
    // TODO: remove this few more versions later
    let flag = false;
    for (const project of projects)
      if (!project.timestampAdded) {
        project.timestampAdded = Date.now();
        project.timestampModified = Date.now();
        flag = true;
      }
    if (flag) {
      await db.bulkDocs(projects);
    }
    return projects;
  } catch (error) {
    console.log(error);
    return [];
  }
}

export async function renamePDF(project: Project) {
  if (project.path === undefined) return;
  let author = "";
  const year = project.issued?.["date-parts"][0][0] || "Unknown";
  const title = project.title;
  const extension = await extname(project.path);
  if (!project.author || project.author.length === 0) {
    // no author
    author = "Unknown";
  } else {
    // 1 author
    const author0 = project.author[0];
    author = !!author0.family ? author0.family : (author0.literal as string);

    // more than 1 authors
    if (project.author.length > 1) author += " et al.";
  }
  // replace all "/" to "" and ":" to "-" to avoid bad nameing
  const fileName = `${author} - ${year} - ${title}.${extension}`
    .replaceAll("/", "")
    .replaceAll(":", "-");

  // update backend
  const newPath = project.path.replace(await basename(project.path), fileName);
  await renameFile(project.path, newPath);
  return await updateProject(project._id, {
    path: newPath,
  } as Project);
}

/**
 * Attach a PDF file
 * @param replaceStoredCopy
 */
export async function attachPDF(projectId: string, replaceStoredCopy: boolean) {
  const filePath = await open({
    multiple: false,
    filters: [{ name: "*.pdf", extensions: ["pdf"] }],
  });

  if (typeof filePath === "string") {
    let dstPath = filePath;
    if (replaceStoredCopy)
      dstPath = (await copyFileToProjectFolder(dstPath, projectId)) as string;
    return await updateProject(projectId, { path: dstPath } as Project);
  }
}
