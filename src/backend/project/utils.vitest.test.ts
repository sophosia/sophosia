import { describe, it, expect } from "vitest";
import { sortTree } from "./utils";
import { Folder, Project } from "../database";
type TreeNode = Folder | Project;

describe("utils.ts", () => {
  it("sortTree", () => {
    const root = {
      label: "1",
      children: [
        { label: "1.4", children: [] as TreeNode[] },
        {
          label: "1.2",
          children: [
            { label: "1.2.2", children: [] as TreeNode[] },
            { label: "1.2.1", children: [] as TreeNode[] },
          ],
        },
        { label: "1.1", children: [] as TreeNode[] },
        { label: "1.3", children: [] as TreeNode[] },
      ] as TreeNode[],
    } as TreeNode;

    const sortedRoot = {
      label: "1",
      children: [
        { label: "1.1", children: [] as TreeNode[] },
        {
          label: "1.2",
          children: [
            { label: "1.2.1", children: [] as TreeNode[] },
            { label: "1.2.2", children: [] as TreeNode[] },
          ],
        },
        { label: "1.3", children: [] as TreeNode[] },
        { label: "1.4", children: [] as TreeNode[] },
      ] as TreeNode[],
    } as TreeNode;

    sortTree(root);
    expect(root).toEqual(sortedRoot);
  });
});
