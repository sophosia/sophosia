import { describe, it, expect } from "vitest";
import {
  authorToString,
  getDataType,
  getIdLabel,
  getParentId,
  idToLink,
  idToPath,
  linkToId,
  pathToId,
  sortTree,
  traverseTree,
} from "./utils";
import { db } from "./database";

describe("utils.ts", () => {
  it("sortTree", () => {
    const root = {
      _id: "1",
      children: [
        { _id: "1.4", children: [] },
        {
          _id: "1.2",
          children: [
            { _id: "1.2.2", children: [] },
            { _id: "1.2.1", children: [] },
          ],
        },
        { _id: "1.1", children: [] },
        { _id: "1.3", children: [] },
      ],
    };

    const sortedRoot = {
      _id: "1",
      children: [
        { _id: "1.1", children: [] },
        {
          _id: "1.2",
          children: [
            { _id: "1.2.1", children: [] },
            { _id: "1.2.2", children: [] },
          ],
        },
        { _id: "1.3", children: [] },
        { _id: "1.4", children: [] },
      ],
    };

    sortTree(root);
    expect(root).toEqual(sortedRoot);
  });

  it("traverseTree", () => {
    const root = {
      _id: "1",
      children: [
        { _id: "1.4", children: [] },
        {
          _id: "1.2",
          children: [
            { _id: "1.2.2", children: [] },
            { _id: "1.2.1", children: [] },
          ],
        },
        { _id: "1.1", children: [] },
        { _id: "1.3", children: [] },
      ],
    };

    const renamedTree = {
      _id: "1",
      children: [
        { _id: "renamed", children: [] },
        {
          _id: "1.2",
          children: [
            { _id: "1.2.2", children: [] },
            { _id: "1.2.1", children: [] },
          ],
        },
        { _id: "1.1", children: [] },
        { _id: "1.3", children: [] },
      ],
    };

    traverseTree(root, (node) => {
      node._id = node._id == "1.4" ? "renamed" : node._id;
    });
    expect(root).toEqual(renamedTree);
  });

  it("authorToString", () => {
    let authors = [
      { family: "Feng", given: "Hunt" },
      { literal: "Another name" },
    ];

    expect(authorToString(authors)).toBe("Hunt Feng, Another name");

    expect(authorToString(undefined)).toBe("");
  });

  it("pathToId", () => {
    const path1 = `${db.config.storagePath}/test/path`;
    expect(pathToId(path1)).toBe("test/path");

    const path2 = `${db.config.storagePath}/test/path/file.md`;
    expect(pathToId(path2)).toBe("test/path/file.md");
  });

  it("idToPath", () => {
    const id1 = `test/id`;
    expect(idToPath(id1)).toBe(`${db.config.storagePath}/test/id`);

    const id2 = `test/id.md`;
    expect(idToPath(id2)).toBe(`${db.config.storagePath}/test/id.md`);
  });

  it("linkToId", () => {
    const link1 = "sophosia://open-item/testlink";
    expect(linkToId(link1)).toBe("testlink");

    const link2 = "sophosia://open-item/test%20link";
    expect(linkToId(link2)).toBe("test link");

    const link3 = "sophosia://open-item/projectId/test%20link";
    expect(linkToId(link3)).toBe("projectId/test link");
  });

  it("idToLink", () => {
    const id1 = "testlink";
    expect(idToLink(id1)).toBe("testlink");

    const id2 = "test link";
    expect(idToLink(id2)).toBe("test%20link");

    const id3 = "projectId/test link";
    expect(idToLink(id3)).toBe("projectId/test%20link");
  });

  it("getDataType", () => {
    const dataTypes = new Map();
    dataTypes.set("projetId", "project");
    dataTypes.set("projectId/note.md", "note");
    dataTypes.set("projetId/draw.excalidraw", "note");
    dataTypes.set("SA012345", "pdfAnnotation");

    for (const [id, type] of dataTypes.entries()) {
      expect(getDataType(id)).toBe(type);
    }
  });

  it("getIdLabel", () => {
    const labels = new Map();
    labels.set("projectId/note.md", "note.md");
    labels.set("library/test/category", "category");
    for (const [id, label] of labels.entries()) {
      expect(getIdLabel(id)).toBe(label);
    }
  });

  it("getParentId", () => {
    const parents = new Map();
    parents.set("projectId/note.md", "projectId");
    parents.set("library/test/category", "library/test");
    for (const [id, parent] of parents.entries()) {
      expect(getParentId(id)).toBe(parent);
    }
  });
});
