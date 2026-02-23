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
import {
  PDFAttachment,
  Project,
  SpecialCategory,
  db,
} from "src/backend/database";
import { i18n } from "src/boot/i18n";
import { authorToString, idToPath } from "../utils";
import { basename, extname, join } from "@tauri-apps/api/path";
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

  async getProjects(category: string) {
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

      return projects;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async getAllProjects(): Promise<Project[]> {
    try {
      const projects = [] as Project[];
      const projectFolders = await readDir(db.config.storagePath);
      for (const folder of projectFolders) {
        // only read non-hidden folders
        if (folder.name!.startsWith(".")) continue;
        const project = await this.getProject(folder.name!);
        if (!project) continue; // skip this folder if it has not meta info
        projects.push(project);
      }
      return projects;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  /**
   * Retrieve all PDF files found within a project folder.
   *
   * @param projectId - The unique identifier of the project.
   * @returns Array of PDFAttachment objects for all PDFs found.
   */
  async getPDFs(projectId: string): Promise<PDFAttachment[]> {
    try {
      const projectFolder = idToPath(projectId);
      const entries = await readDir(projectFolder);
      const pdfs: PDFAttachment[] = [];
      for (const entry of entries) {
        try {
          if ((await extname(entry.path)) === "pdf") {
            pdfs.push({
              name: entry.name || (await basename(entry.path)),
              path: entry.path,
            });
          }
        } catch (error) {}
      }
      return pdfs;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  /**
   * @deprecated Use getPDFs() instead. Returns the first PDF found.
   */
  async getPDF(projectId: string) {
    const pdfs = await this.getPDFs(projectId);
    return pdfs.length > 0 ? pdfs[0].path : undefined;
  }

  /**
   * Renames a specific PDF file associated with a project based on a generated citation key.
   *
   * @param projectId - The project whose associated PDF needs renaming.
   * @param renameRule - The rule used to generate the new filename.
   * @param pdfName - The filename of the specific PDF to rename.
   * @returns The new path of the renamed PDF file or undefined if the PDF is not found.
   */
  async renamePDF(projectId: string, renameRule: string, pdfName?: string) {
    const project = await this.getProject(projectId);
    if (!project) return;
    const pdfs = await this.getPDFs(projectId);
    const pdf = pdfName
      ? pdfs.find((p) => p.name === pdfName)
      : pdfs[0];
    if (!pdf) return;
    const oldPath = pdf.path;
    const fileName = generateCiteKey(project, renameRule) + ".pdf";
    const newPath = await join(db.config.storagePath, project._id, fileName);
    await renameFile(oldPath, newPath);
    return newPath;
  }

  /**
   * Remove a specific PDF file from a project and update the project metadata.
   *
   * @param projectId - The project ID
   * @param pdfName - The filename of the PDF to remove
   */
  async removePDF(projectId: string, pdfName: string): Promise<void> {
    try {
      const pdfPath = idToPath(`${projectId}/${pdfName}`);
      if (await exists(pdfPath)) await removeFile(pdfPath);

      // Update project metadata to remove the PDF from the pdfs array
      const project = await this.getProject(projectId);
      if (project) {
        project.pdfs = (project.pdfs || []).filter((p) => p.name !== pdfName);
        await this.saveProjectNote(project);
      }
    } catch (error) {
      console.log(error);
    }
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
   * @returns {Promise<string | undefined>} The filename of the copied PDF, or undefined if no file is selected.
   *
   * Opens a file dialog to select a PDF and copies it to the project's folder.
   * Multiple PDFs can be attached to a single project.
   */
  async attachPDF(projectId: string): Promise<string | undefined> {
    const filePath = await open({
      multiple: false,
      filters: [{ name: "*.pdf", extensions: ["pdf"] }],
    });

    if (typeof filePath !== "string") return;
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

      // Migrate old single-path format to multi-PDF format
      if (!project.pdfs) {
        const oldPath = (project as any).path;
        if (typeof oldPath === "string" && oldPath) {
          const name = await basename(oldPath);
          project.pdfs = [{ name, path: oldPath }];
        } else {
          project.pdfs = [];
        }
        delete (project as any).path;
        // Re-save to persist the migration
        await this.saveProjectNote(project);
      }

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
