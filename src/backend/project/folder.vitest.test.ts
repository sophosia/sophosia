import { describe, it, expect, afterEach, vi, afterAll } from "vitest";
import {
  getFolderTree,
  addFolder,
  updateFolder,
  deleteFolder,
  moveFolderInto,
  getParentFolder,
  getFolder,
} from "src/backend/project/folder";
import { db, Folder, JsonDB, SpecialFolder } from "../database";

const fakeFolder = {
  _id: "fake",
  timestampAdded: Date.now(),
  timestampModified: Date.now(),
  dataType: "folder",
  label: "fake",
  icon: "folder",
  children: [],
} as Folder;

const fakeDocs = [] as Folder[];

db.storagePath = "test/test-storage";
vi.spyOn(db, "get").mockImplementation(
  async (folderId: string) =>
    fakeDocs.find((doc) => doc._id === folderId) as any
);
vi.spyOn(db, "getDocs").mockImplementation(
  async (dataType: string) => fakeDocs
);
vi.spyOn(db, "put").mockImplementation(async (folder) => {
  fakeDocs.push(folder);
});
vi.spyOn(db, "remove").mockImplementation(async (folder) => {
  fakeDocs.filter((doc) => doc !== folder._id);
});

describe("folder.ts", () => {
  afterAll(() => {
    vi.clearAllMocks();
  });

  it("getFolderTree", async () => {
    const tree = (await getFolderTree()) as Folder[];
    expect(tree[0]._id).toBe(SpecialFolder.LIBRARY);
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
        _id: folder._id,
      },
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
