import {
  copyFile,
  createDir,
  exists,
  readTextFile,
  removeDir,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { Project } from "src/backend/database";
import { i18n } from "src/boot/i18n";
import { authorToString, idToPath } from "../utils";
import { basename } from "@tauri-apps/api/path";
const { t } = i18n.global;

class ProjectFileAGUD {
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
