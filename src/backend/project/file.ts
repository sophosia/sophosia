import { db, AppState } from "../database";


import { join, basename, dirname } from '@tauri-apps/api/path';
import { createDir, removeDir, copyFile, exists, removeFile, renameFile} from "@tauri-apps/api/fs"

/**
 * Get storagePath from database
 * @returns storagePath
 */
async function storagePath(): Promise<string> {
  let state: AppState = await db.get("appState");
  return state.settings.storagePath;
}

/**
 * Create project folder in storage path
 * @param projectId
 */
async function createProjectFolder(projectId: string) {
  try {
    // if (!path || !fs) return; // Need to find another way to check for error
    // let projectPath = path.join(await storagePath(), projectId);
    let projectPath = await join(await storagePath(), projectId);

    // fs.mkdirSync(projectPath);
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
    // if (!path || !fs) return;
    // let dirPath = path.join(await storagePath(), projectId);
    let dirPath = await join(await storagePath(), projectId);
    // fs.rmdirSync(dirPath, { recursive: true });
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
async function copyFilefun(
  srcPath: string,
  projectId: string
): Promise<string | undefined> {
  try {
    // if (!path || !fs) return;
    // let fileName = path.basename(srcPath);
    // let dstPath = path.join(await storagePath(), projectId, fileName);
    // fs.copyFileSync(srcPath, dstPath);

    let fileName = await basename(srcPath);
    let dstPath = await join(await storagePath(), projectId, fileName);
    await copyFile(srcPath,dstPath);

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
    // if (!path || !fs) return;
    // let filePath = path.join(await storagePath(), projectId, fileName);
    let filePath = await join(await storagePath(), projectId, fileName);

    // fs.closeSync(fs.openSync(filePath, "w"));
    if( await exists(filePath))
    return filePath;
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
    // if (!fs) return;
    // we can ignore this error since rmSync is there
    await removeFile(filePath);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Rename a file
 * @param filePath - path to file
 * @param fileName - new file name
 */
async function renameFilefun(filePath: string, fileName: string) {
  try {
    // if (!path || !fs) return;
    // let dirname = path.dirname(filePath);

    // let newPath = path.join(dirname, fileName.replace("/", ""));
    let dir = await dirname(filePath);
    let newPath = await join(dir, fileName.replace("/", ""));

    await renameFilefun(filePath, newPath);
    return newPath;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Move folder
 * @param srcPath source path
 * @param dstPath destination path
 */
async function changePath(srcPath: string, dstPath: string): Promise<Error | undefined> {
  try {
    // if (!fs) return;
    await renameFilefun(srcPath, dstPath);
  } catch (error) {
    console.log(error);
    return error as Error;
  }
}

export {
  createProjectFolder,
  deleteProjectFolder,
  copyFilefun,
  createFile,
  deleteFile,
  renameFilefun,
  changePath,
};
