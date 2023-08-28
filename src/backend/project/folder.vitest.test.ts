import { describe, it, expect } from "vitest";
import {
  getFolderTree,
  addFolder,
  updateFolder,
  deleteFolder,
  moveFolderInto,
  getParentFolder
} from "src/backend/project/folder";
import { db, Folder } from "../database";

describe("folder.ts", () => {
  it("getFolderTree", async () => {
    const tree = (await getFolderTree()) as Folder[];
    expect(tree[0]._id).toBe("library");
  });

  it("updateFolder", async () => {
    const parentId = "library";
    const f = (await addFolder(parentId)) as Folder;
    const label = "test label";
    const folder = (await updateFolder(f._id, { label } as Folder)) as Folder;
    expect(folder.label).toBe(label);
  });

  it("deleteFolder", async () => {
    const parentId = "library";
    const folder = (await addFolder(parentId)) as Folder;
    await deleteFolder(folder._id);

    const results = await db.find({
      selector: {
        _id: folder._id
      }
    });
    expect(results.docs.length).toBe(0);
  });

  it("addFolder", async () => {
    const parentId = "library";
    const folder = (await addFolder(parentId)) as Folder;
    const parentFolder = (await getParentFolder(folder._id)) as Folder;
    expect(parentFolder.children).toContain(folder._id);
  });

  it("moveFolderInto", async () => {
    const folder1 = (await addFolder("library")) as Folder;
    const folder2 = (await addFolder("library")) as Folder;
    await moveFolderInto(folder1._id, folder2._id);
    const parentFolder = (await getParentFolder(folder1._id)) as Folder;
    expect(parentFolder.children).toContain(folder1._id);
  });
});
