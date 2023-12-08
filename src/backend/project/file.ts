import { db, AppState, Project } from "../database";

import { join, basename, dirname } from "@tauri-apps/api/path";
import {
  createDir,
  removeDir,
  copyFile,
  exists,
  renameFile,
  removeFile,
  writeTextFile,
} from "@tauri-apps/api/fs";
import { authorToString } from "./utils";
import { i18n } from "src/boot/i18n";
const { t } = i18n.global;

/**
 * Create project folder in storage path
 * And create folder note inside this folder
 * @param projectId
 */
async function createProjectFolder(project: Project) {
  try {
    const projectPath = await join(db.storagePath, project._id);
    const projectNotePath = await join(
      db.storagePath,
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
    const dirPath = await join(await db.getStoragePath(), projectId);
    await removeDir(dirPath, { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Copy file to the corresponding project folder and returns the new file relative path
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
    const dstRelPath = await join(projectId, fileName);
    const dstPath = await join(await db.getStoragePath(), dstRelPath);
    await copyFile(srcPath, dstPath);

    return dstRelPath;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Create a file inside project folder
 * @param projectId
 * @param fileName - the created file's name
 * @returns filePath - the created file's path
 */
async function createFile(
  projectId: string,
  fileName: string
): Promise<string | undefined> {
  try {
    const filePath = await join(await db.getStoragePath(), projectId, fileName);
    await writeTextFile(filePath, "");
    if (await exists(filePath)) return filePath;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete file
 * @param filePath
 */
async function deleteFile(filePath: string) {
  try {
    // we can ignore this error since rmSync is there
    await removeFile(filePath);
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
  createFile,
  deleteFile,
  changePath,
};
