import { db, AppState } from "../database";

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

/**
 * Get storagePath from database
 * @returns storagePath
 */
async function storagePath(): Promise<string> {
  const state: AppState = await db.get("appState");
  return state.settings.storagePath;
}

/**
 * Create project folder in storage path
 * @param projectId
 */
async function createProjectFolder(projectId: string) {
  try {
    const projectPath = await join(await storagePath(), projectId);
    await createDir(projectPath);
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
    const dirPath = await join(await storagePath(), projectId);
    await removeDir(dirPath, { recursive: true });
  } catch (error) {
    console.log(error);
  }
}

/**
 * Copy file to the corresponding project folder and returns the new file path
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
    const dstPath = await join(await storagePath(), projectId, fileName);
    await copyFile(srcPath, dstPath);

    return dstPath;
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
    const filePath = await join(await storagePath(), projectId, fileName);
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
