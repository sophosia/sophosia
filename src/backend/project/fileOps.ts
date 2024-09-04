import {
  copyFile,
  createDir,
  exists,
  readDir,
  readTextFile,
  removeDir,
  removeFile,
  renameFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { Project, SpecialCategory, db } from "src/backend/database";
import { i18n } from "src/boot/i18n";
import { authorToString, idToPath } from "../utils";
import { basename, extname, join } from "@tauri-apps/api/path";
import { getNoteTree, getNotes } from "../note";
import { generateCiteKey } from "../meta";
import { open } from "@tauri-apps/api/dialog";
const { t } = i18n.global;

class ProjectFileAGUD {
  async getProject(projectId: string) {
    try {
      return (await this.loadProjectNote(projectId)) as Project;
    } catch (error) {
      console.log(error);
    }
  }

  async getProjects(
    category: string,
    options?: { includePDF?: boolean; includeNotes?: boolean }
  ) {
    try {
      let projects = await this.getAllProjects();
      switch (category) {
        case SpecialCategory.LIBRARY:
          break;
        case SpecialCategory.ADDED:
          const date = new Date();
          // get recently added project in the last 30 days
          const timestamp = date.setDate(date.getDate() - 30);
          projects = projects.filter(
            (project) => project.timestampAdded > timestamp
          );
          // sort projects in descending order
          projects.sort((a, b) => b.timestampAdded - a.timestampAdded);
          break;
        case SpecialCategory.FAVORITES:
          projects = projects.filter((project) => project.favorite);
          break;
        default:
          projects = projects.filter((project) =>
            project.categories.includes(category)
          );
          break;
      }

      for (const project of projects) {
        if (options?.includePDF) project.path = await this.getPDF(project._id);
        if (options?.includeNotes)
          project.children = await getNoteTree(project._id);
      }

      return projects;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getAllProjects(options?: {
    includePDF?: boolean;
    includeNotes?: boolean;
  }): Promise<Project[]> {
    try {
      const projects = [] as Project[];
      const projectFolders = await readDir(db.config.storagePath);
      for (const folder of projectFolders) {
        // only read non-hidden folders
        if (folder.name!.startsWith(".")) continue;
        const project = await this.getProject(folder.name!);
        if (!project) continue; // skip this folder if it has not meta info
        if (options?.includePDF) project.path = await this.getPDF(project._id);
        if (options?.includeNotes)
          project.children = await getNotes(project._id);
        projects.push(project);
      }
      return projects;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  /**
   * Retrieve the path of the first PDF file found within a project folder.
   *
   * @param projectId - The unique identifier of the project.
   * @returns The path of the first PDF file found, or undefined if no PDF is found or an error occurs.
   */
  async getPDF(projectId: string) {
    try {
      const projectFolder = idToPath(projectId);
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

  /**
   * Renames the PDF file associated with a project based on a generated citation key.
   *
   * @param projectId - The project whose associated PDF needs renaming.
   * @returns The new path of the renamed PDF file or undefined if the project has no associated path.
   *
   * Generates a new filename using the citation key and moves the PDF file to this new path.
   */
  async renamePDF(projectId: string, renameRule: string) {
    const project = await this.getProject(projectId);
    if (!project) return;
    project.path = await this.getPDF(projectId);
    if (project.path === undefined) return;
    const oldPath = project.path;
    const fileName = generateCiteKey(project, renameRule) + ".pdf";
    const newPath = await join(db.config.storagePath, project._id, fileName);
    await renameFile(oldPath, newPath);
    return newPath;
  }

  async deleteProject(projectId: string) {
    // remove project and its related pdfState, pdfAnnotation and notes on db
    for (let dataType of ["pdfState", "pdfAnnotation"]) {
      const docs = await db.getDocs(dataType);
      for (const doc of docs) if (doc._id === projectId) await db.remove(doc);
    }

    // remove the acutual files
    await this.deleteProjectFolder(projectId);
  }

  /**
   * Attaches a PDF file to a project by copying it to the project's folder.
   *
   * @param {string} projectId - The ID of the project to attach the PDF to.
   * @returns {Promise<string | undefined>} The path of the copied PDF file in the project's folder, or undefined if no file is selected.
   *
   * Opens a file dialog to select a PDF, removes any existing PDF associated with the project, and copies the selected PDF to the project's folder.
   */
  async attachPDF(projectId: string): Promise<string | undefined> {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "*.pdf", extensions: ["pdf"] }],
    });

    if (typeof filePath !== "string") return;
    const oldPDFPath = await this.getPDF(projectId);
    if (oldPDFPath) await removeFile(oldPDFPath);
    return await this.copyFileToProjectFolder(filePath, projectId);
  }

  async saveProjectNote(project: Project): Promise<void> {
    try {
      const meta = `
${t("note-is-auto-manged")}
# ${project.label}
${project.dataType === "project" && t("author")}: ${authorToString(
        project.author
      )}
${project.dataType === "project" && t("abstract")}: ${project.abstract || ""}

## meta
\`\`\`json
${JSON.stringify(project, null, 2)}
\`\`\`
`;
      await writeTextFile(idToPath(`${project._id}/${project._id}.md`), meta);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Load project from markdown note in project folder
   *
   * @param {string} projectId
   * @returns {Promise<Project | undefined>} - Project data without pdf and notes
   */
  async loadProjectNote(projectId: string): Promise<Project | undefined> {
    try {
      const folderNote = await readTextFile(
        idToPath(`${projectId}/${projectId}.md`)
      );
      const lines = folderNote.split("\n");
      const startIndex = lines.indexOf("```json");
      const endIndex = lines.indexOf("```");
      if (startIndex === -1 || startIndex > endIndex)
        throw Error(`Cannot find meta data of project ${projectId}`);
      const metaString = lines.slice(startIndex + 1, endIndex).join("\n");
      const project = JSON.parse(metaString) as Project;
      return project;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Creates a project folder and initializes a Markdown note file for the given project.
   *
   * @param {Project} project - The project for which the folder and note file are to be created.
   *
   * Creates a new directory for the project in the designated storage path, and a Markdown file
   * with basic project details if they don't already exist. The Markdown file includes the project's label,
   * author, and abstract, along with a note about auto-management.
   *
   * @throws Logs an error if any file or directory creation process fails.
   */
  async createProjectFolder(project: Project) {
    try {
      // create project folder
      const projectPath = idToPath(project._id);
      if (!(await exists(projectPath))) await createDir(projectPath);
      await this.saveProjectNote(project);
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Delete the project folder in storage path
   * @param projectId
   */
  async deleteProjectFolder(projectId: string) {
    try {
      await removeDir(idToPath(projectId), { recursive: true });
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Copy file to the corresponding project folder and returns the filename
   * @param srcPath
   * @param projectId
   * @returns dstPath
   */
  async copyFileToProjectFolder(
    srcPath: string,
    projectId: string
  ): Promise<string | undefined> {
    try {
      const fileName = await basename(srcPath);
      const dstPath = idToPath(`${projectId}/${fileName}`);
      await copyFile(srcPath, dstPath);

      return fileName;
    } catch (error) {
      console.log(error);
    }
  }
}

export const projectFileAGUD = new ProjectFileAGUD();
