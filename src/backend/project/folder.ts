import { db, Folder, Project, SpecialFolder } from "../database";
import { updateProject } from "./project";
import { sortTree } from "./utils";

async function getFolder(folderId: string): Promise<Folder | undefined> {
  try {
    return (await db.get(folderId)) as Folder;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get the folder tree
 * @returns tree
 */
async function getFolderTree(): Promise<Folder[] | undefined> {
  try {
    const docs = await db.getDocs("folder");

    // no folders in db yet
    if (docs.length == 0) {
      // create library folder for user if there is none
      const library = {
        _id: "SFlibrary",
        timestampAdded: Date.now(),
        timestampModified: Date.now(),
        label: "Library",
        icon: "mdi-bookshelf",
        children: [],
        dataType: "folder",
      } as Folder;
      await db.put(library);
      return [library];
    }

    // create a dict for later use
    const folders: { [k: string]: Folder } = {};
    for (const folder of docs as Folder[]) {
      folders[folder._id] = folder;
    }
    // create tree using depth first search
    function _dfs(root: Folder, folderTreeRoot: Folder) {
      Object.assign(folderTreeRoot, root);
      folderTreeRoot.children = [];
      for (const [i, childId] of root.children.entries()) {
        folderTreeRoot.children.push({} as Folder);
        _dfs(folders[childId as string], folderTreeRoot.children[i] as Folder);
      }
    }

    const library = {} as Folder;
    _dfs(folders[SpecialFolder.LIBRARY], library);
    sortTree(library);

    return [library];
  } catch (err) {
    console.log(err);
  }
}

/**
 * Add a subfolder to parent folder
 * @param parentId - parent folder id
 */
async function addFolder(parentId: string) {
  try {
    // add to database
    const folder = {
      _id: `SF${db.nanoid}`,
      timestampAdded: Date.now(),
      timestampModified: Date.now(),
      label: "New Folder",
      icon: "mdi-folder",
      children: [],
      dataType: "folder",
    } as Folder;
    await db.put(folder);

    // push to children of parent Node
    const parentNode = (await db.get(parentId)) as Folder;
    parentNode.children.push(folder._id);
    await updateFolder(parentId, { children: parentNode.children } as Folder);

    return folder;
  } catch (err) {
    console.log(err);
  }
}

/**
 * Update folder properties
 * @param folderId
 * @param props - Folder
 */
async function updateFolder(folderId: string, props: Folder) {
  try {
    const folder = (await db.get(folderId)) as Folder;
    props.timestampModified = Date.now();
    Object.assign(folder, props);
    await db.put(folder);
    return folder;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a folder and also remove the folderId from associated projects
 * @param folderId
 */
async function deleteFolder(folderId: string) {
  try {
    const parentNode = (await getParentFolder(folderId)) as Folder;
    parentNode.children = parentNode.children.filter((id) => id != folderId);
    await db.put(parentNode);

    const docs = await db.getDocs("folder");

    // create a dict for later use
    const folders: { [key: string]: Folder } = {};
    for (const doc of docs) folders[doc._id] = doc as Folder;

    function _dfs(root: Folder) {
      const removedFolderIds = [] as string[];
      db.remove(root);
      removedFolderIds.push(root._id);
      for (const childId of root.children) {
        removedFolderIds.push(..._dfs(folders[childId as string]));
      }
      return removedFolderIds;
    }

    const removedFolderIds = _dfs(folders[folderId]);

    // update associated projects
    const projects = (await db.getDocs("project")) as Project[];
    for (const project of projects) {
      const folderIds = project.folderIds.filter(
        (id) => !removedFolderIds.includes(id)
      );
      updateProject(project._id, { folderIds } as Project);
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Get the parent folder of a given folder
 * @param folderId
 * @returns parentFolder
 */
async function getParentFolder(folderId: string): Promise<Folder | undefined> {
  try {
    let folders = (await db.getDocs("folder")) as Folder[];
    return folders.filter((folder) => folder.children.includes(folderId))[0];
  } catch (error) {
    console.log(error);
  }
}

/**
 * Move the dragFolder into the dropFolder
 * @param dragFolderId
 * @param dropFolderId
 */
async function moveFolderInto(dragFolderId: string, dropFolderId: string) {
  try {
    // remove from dragFolder's parent folder first
    const dragParentFolder = (await getParentFolder(dragFolderId)) as Folder;
    dragParentFolder.children = dragParentFolder.children.filter(
      (id) => id != dragFolderId
    );
    await updateFolder(dragParentFolder._id, {
      children: dragParentFolder.children,
    } as Folder);

    // add to dropFolder after the dragParentFolder is modified
    const dropFolder = (await db.get(dropFolderId)) as Folder;
    dropFolder.children.push(dragFolderId);
    await updateFolder(dropFolderId, {
      children: dropFolder.children,
    } as Folder);
  } catch (error) {
    console.log(error);
  }
}

export {
  getFolder,
  getFolderTree,
  addFolder,
  updateFolder,
  deleteFolder,
  moveFolderInto,
  getParentFolder,
};
