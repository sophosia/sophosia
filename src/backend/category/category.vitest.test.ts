import "src/backend/category";
import { beforeAll, describe, expect, it } from "vitest";
import { SpecialCategory } from "../database";
import {
  getCategoryTree,
  updateCategory,
  deleteCategory,
} from "src/backend/category";
import { addProject, createProject } from "../project";

describe("category", () => {
  beforeAll(async () => {
    const project = createProject("library");
    project.categories.push("library/test-category1");
    project.categories.push("library/test-category2");
    await addProject(project);
  });

  it("getCategoryTree", async () => {
    const tree = await getCategoryTree();
    expect(tree[0]._id).toBe(SpecialCategory.LIBRARY);
    expect(tree[0].children.length).toBe(2);
    expect(tree[0].children[0]._id).toBe("library/test-category1");
  });

  it("updateCategory", async () => {
    await updateCategory(
      "library/test-category1",
      "library/new-test-category1"
    );
    const tree = await getCategoryTree();
    expect(tree[0].children.length).toBe(2);
    expect(tree[0].children[0]._id).toBe("library/new-test-category1");
  });

  it("moveCategoryTo", async () => {
    await updateCategory(
      "library/test-category2",
      "library/new-test-category1/test-category2"
    );
    const tree = await getCategoryTree();
    expect(tree[0].children.length).toBe(1);
    expect(tree[0].children[0]._id).toBe("library/new-test-category1");
    expect(tree[0].children[0].children.length).toBe(1);
    expect(tree[0].children[0].children[0]._id).toBe(
      "library/new-test-category1/test-category2"
    );
  });

  it("deleteCategory", async () => {
    await deleteCategory("library/new-test-category1");
    const tree = await getCategoryTree();
    expect(tree[0].children.length).toBe(0);
  });
});
