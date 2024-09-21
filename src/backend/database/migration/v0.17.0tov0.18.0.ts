/**
 * Migration from v0.16.3 to v0.17.0
 * By changing Folder data {_id, label, children} to category path, we get the following benefits
 * 1. easy to understand, this increases the portability of project meta
 * 2. easy to manipulate, we can easily infer the parent folders or subfolders
 * 3. more compact data storage, we can remove .sophosia/folder
 * 4. enable advanced projects organization, we can choose to display the projects within sub-categories.
 * 5. easier to maintain the app. Before this we have Folder type and FolderOrNote type, these two are quite confusing.
 * By getting rid of the use of Folder data, it is clear what FolderOrNote is doing.
 *
 * Here is a drawback:
 * 1. Now category cannot exists independent of projects (with the exception of root categories like library, added, favorites, ...).
 * This is because the category paths must be saved in some project meta file.
 * If no projects are in that category, then this category path can't be saved.
 * But this is acceptable since there is no meaning with an empty category.
 *
 * 2. We lose the timestamp information of the category.
 * This is also acceptable because there is not much use to find out when this category is being added/modified.
 *
 * @example
 * SF123456 -> library/Plasma Instability
 */
import { join } from "@tauri-apps/api/path";
import { db } from "../jsondb";
import { exists, readDir, readTextFile, removeDir } from "@tauri-apps/api/fs";
import { Project } from "../models";
import { updateProject } from "src/backend/project";
import { projectFileAGUD } from "src/backend/project/fileOps";

/**
 * Folder is for both database and UI display use
 * when saving to database, children: string[] is a list of subfolder ids
 * when displaying on UI, children: Folder[] is a list of Folder objects
 */
export interface Folder {
  _id: string; // uid managed by db
  timestampAdded: number; // timestamp when data is saved
  timestampModified: number; // timestamp when data is updated
  dataType: "folder"; // for database search
  label: string; // folder name
  icon: string; // folder icon in treeview
  children: (string | Folder)[]; // folderId list or Folder object list
}

/**
 * Change folderIds in each project to their corresponding category path
 *
 * @example
 * SF123456 -> library/Plasma Instability
 * SF123457 -> library/Bondi-Parker Flow
 */
export async function changeFolderIdToCategoryPath() {
  console.log("v0.17.0 data migration: changing folderIds to category paths");
  const folders = await getFolders();
  if (!folders) return;

  const folderIdToPathMap = buildIdToPathMap(folders);
  const projects = (await projectFileAGUD.getAllProjects()) as Project[];
  for (const project of projects) {
    if (!project.folderIds || project.folderIds.length === 0)
      project.folderIds = ["SFlibrary"];
    project.categories = project.folderIds.map(
      (folderId: string) => folderIdToPathMap[folderId]
    );
    updateProject(project._id, project);
  }

  await removeFolders();
}

/**
 * Get all folder data from the hidden folder
 *
 * @returns {Promise<Folder[] | undefined>} folders - folder data
 */
async function getFolders(): Promise<Folder[] | undefined> {
  try {
    const path = await join(db.config.storagePath, ".sophosia", "folder");
    if (!(await exists(path))) return;
    const entries = await readDir(path);
    const folders = [] as Folder[];
    for (const entry of entries) {
      folders.push(JSON.parse(await readTextFile(entry.path)));
    }
    return folders;
  } catch (error) {}
}

/**
 * Remove the folder directory from the hidden folder
 */
async function removeFolders() {
  const path = await join(db.config.storagePath, ".sophosia", "folder");
  await removeDir(path, { recursive: true });
}

/**
 * Build a map to convert folderId to category path
 *
 * @example
 * folderIdToPathMap[SF123456] -> library/Plasma Physics
 *
 * @param {Folder[]} folders - folder data
 * @returns {Record<string, string>} folderIdToPathMap - a hasmap like this {folderId: categoryPath}
 */
function buildIdToPathMap(folders: Folder[]): Record<string, string> {
  const idToFolderMap: Record<string, Folder> = {};
  const idToPathMap: Record<string, string> = {};

  // step 1: create a map from folderId to Folder for easy lookup
  folders.forEach((folder) => {
    idToFolderMap[folder._id] = folder;
  });

  // step 2: function to build path recursively
  function getPath(folderId: string): string {
    if (idToPathMap[folderId]) {
      return idToPathMap[folderId];
    }

    const folder = idToFolderMap[folderId];
    if (!folder) return "";

    // for library folder, keep it to library instead of Library or 项目库
    const path = folder._id === "SFlibrary" ? "library" : folder.label;
    idToPathMap[folderId] = path;

    folder.children.forEach((subfolderId) => {
      idToPathMap[subfolderId as string] = `${path}/${getPath(
        subfolderId as string
      )}`;
    });

    return path;
  }

  // step 3: populate the paths for all folders
  folders.forEach((folder) => {
    getPath(folder._id);
  });

  return idToPathMap;
}
