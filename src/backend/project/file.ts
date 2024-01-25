import { db, Project } from "../database";

import { join, basename } from "@tauri-apps/api/path";
import {
  createDir,
  removeDir,
  copyFile,
  exists,
  renameFile,
  writeTextFile
} from "@tauri-apps/api/fs";
import { authorToString } from "./utils";
import { i18n } from "src/boot/i18n";
const { t } = i18n.global;

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
async function createProjectFolder(project: Project) {
  try {
    const projectPath = await join(db.config.storagePath, project._id);
    const projectNotePath = await join(
      db.config.storagePath,
      project._id,
      project._id + ".md"
    );
    if (!(await exists(projectPath))) await createDir(projectPath);
    if (!(await exists(projectNotePath))) {
      const content = `
# ${project.label}
${t("author")}: ${authorToString(project.author)}
${t("abstract")}: ${project.abstract || ""}

${t("note-is-auto-manged")}
`;
      await writeTextFile(projectNotePath, content);
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete the project folder in storage path
 * @param projectId
 */
async function deleteProjectFolder(projectId: string) {
  try {
    const dirPath = await join(db.config.storagePath, projectId);
    await removeDir(dirPath, { recursive: true });
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
async function copyFileToProjectFolder(
  srcPath: string,
  projectId: string
): Promise<string | undefined> {
  try {
    const fileName = await basename(srcPath);
    const dstPath = await join(
      await db.config.storagePath,
      projectId,
      fileName
    );
    await copyFile(srcPath, dstPath);

    return fileName;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Move folder
 * @param srcPath source path
 * @param dstPath destination path
 */
async function changePath(
  srcPath: string,
  dstPath: string
): Promise<Error | undefined> {
  try {
    await renameFile(srcPath, dstPath);
  } catch (error) {
    console.log(error);
    return error as Error;
  }
}

export {
  createProjectFolder,
  deleteProjectFolder,
  copyFileToProjectFolder,
  changePath
};
