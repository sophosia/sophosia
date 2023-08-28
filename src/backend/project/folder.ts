import { uid } from "quasar";
import { db, Folder } from "../database";
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
    const result = await db.find({
      selector: {
        dataType: "folder"
      }
    });
    const docs = result.docs;

    // no folders in db yet
    if (docs.length == 0) {
      // create library folder for user if there is none
      const library = {
        _id: "library",
        _rev: "",
        timestampAdded: Date.now(),
        timestampModified: Date.now(),
        label: "Library",
        icon: "home",
        children: [],
        dataType: "folder"
      } as Folder;
      await db.put(library);
      return [library];
    }

    // TODO: remove this few more versions later
    let flag = false;
    for (const folder of result.docs as Folder[])
      if (!folder.timestampAdded) {
        folder.timestampAdded = Date.now();
        folder.timestampModified = Date.now();
        flag = true;
      }
    if (flag) {
      const responses = await db.bulkDocs(result.docs);
      for (const i in responses) {
        const rev = responses[i].rev;
        if (rev) result.docs[i]._rev = rev;
      }
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
    _dfs(folders["library"], library);
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
      _id: uid(),
      _rev: "",
      timestampAdded: Date.now(),
      timestampModified: Date.now(),
      label: "New Folder",
      icon: "folder",
      children: [],
      dataType: "folder"
    } as Folder;
    await db.put(folder);

    // push to children of parent Node
    const parentNode: Folder = await db.get(parentId);
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
    const folder: Folder = await db.get(folderId);
    props._rev = folder._rev;
    props.timestampModified = Date.now();
    Object.assign(folder, props);
    const result = await db.put(folder);
    folder._rev = result.rev;
    return folder;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a folder
 * @param folderId
 */
async function deleteFolder(folderId: string) {
  try {
    // delete from children of parent folder
    let result = await db.find({
      selector: { children: { $in: [folderId] } }
    });
    const parentNode = result.docs[0] as Folder;
    parentNode.children = parentNode.children.filter((id) => id != folderId);
    await db.put(parentNode);

    // delete subfolders using dfs
    result = await db.find({
      selector: {
        dataType: "folder"
      }
    });
    const docs = result.docs;

    // create a dict for later use
    const folders: { [key: string]: Folder } = {};
    for (const doc of docs) folders[doc._id] = doc as Folder;

    function _dfs(root: Folder) {
      db.remove(root as PouchDB.Core.RemoveDocument);
      for (const childId of root.children) {
        _dfs(folders[childId as string]);
      }
    }

    _dfs(folders[folderId]);
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
    const result = await db.find({
      selector: {
        dataType: "folder",
        children: { $in: [folderId] }
      }
    });
    // the parent folder is unique
    return result.docs[0] as Folder;
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
      children: dragParentFolder.children
    } as Folder);

    // add to dropFolder after the dragParentFolder is modified
    const dropFolder: Folder = await db.get(dropFolderId);
    dropFolder.children.push(dragFolderId);
    await updateFolder(dropFolderId, {
      children: dropFolder.children
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
  getParentFolder
};
