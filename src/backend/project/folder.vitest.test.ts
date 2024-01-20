import {
  addFolder,
  deleteFolder,
  getFolder,
  getFolderTree,
  getParentFolder,
  moveFolderInto,
  updateFolder,
} from "src/backend/project/folder";
import { beforeEach, describe, expect, it } from "vitest";
import { Folder, SpecialFolder, db } from "../database";

const library = {
  _id: SpecialFolder.LIBRARY,
  timestampAdded: Date.now(),
  timestampModified: Date.now(),
  label: "Library",
  icon: "mdi-bookshelf",
  children: [],
  dataType: "folder",
} as Folder;

describe("folder.ts", () => {
  beforeEach(async () => {
    await db.put(library);
  });

  it("getFolderTree", async () => {
    const tree = (await getFolderTree()) as Folder[];
    expect(tree[0]._id).toBe(SpecialFolder.LIBRARY);
  });

  it("addFolder", async () => {
    const parentId = library._id;
    const folder = (await addFolder(parentId)) as Folder;
    const parentFolder = (await getParentFolder(folder._id)) as Folder;
    expect(parentFolder.children).toContain(folder._id);
  });

  it("updateFolder", async () => {
    const parentId = library._id;
    const folder = (await addFolder(parentId)) as Folder;
    const label = "test label";
    const newFolder = (await updateFolder(folder._id, {
      label,
    } as Folder)) as Folder;
    expect(newFolder.label).toBe(label);
  });

  it("deleteFolder", async () => {
    const parentId = library._id;
    const folder = (await addFolder(parentId)) as Folder;
    await deleteFolder(folder._id);
    const newFolder = await getFolder(folder._id);
    expect(newFolder).toBe(undefined);
  });

  it("moveFolderInto", async () => {
    const folder1 = (await addFolder(library._id)) as Folder;
    const folder2 = (await addFolder(library._id)) as Folder;
    await moveFolderInto(folder1._id, folder2._id);
    const parentFolder = (await getParentFolder(folder1._id)) as Folder;
    expect(parentFolder.children).toContain(folder1._id);
  });
});
