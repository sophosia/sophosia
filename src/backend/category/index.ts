import { QTreeNode } from "quasar";
import { CategoryNode } from "../database";
import { sortTree } from "../utils";
import { categoryFileAGUD } from "./fileOps";
import { categorySQLAGUD } from "./sqliteOps";

/**
 * Get an array of all categories
 * @returns {string[]} categories
 */
export async function getCategories(): Promise<string[]> {
  try {
    // use sqldb first
    let categories = await categorySQLAGUD.getCategories();
    // fallback to filedb
    if (categories.length === 0)
      categories = await categoryFileAGUD.getCategories();
    // default to library
    if (categories.length === 0) categories = ["library"];
    return categories;
  } catch (error) {
    console.log(error);
    return ["library"];
  }
}

/**
 * Get the category tree
 *
 * @returns {CategoryNode[]} categoryTree - The category tree
 *
 * @example
 * unique categories in db: ["a", "a/b", "a/c/d"]
 * Return:
 * [{_id:"a", children: [
 *  {_id: "a/b", children: []}
 *  {_id: "a/c", children: [
 *    {_id: "a/c/d", children: []}
 *    ]}
 *  ]}]
 * Note that "a/c" is not in db, but it is cleared it exists because "a/c/d" exists.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  try {
    const categories = await getCategories();
    // build tree
    const root = { _id: "root", children: [] } as CategoryNode;
    for (const category of categories) {
      const parts = category.split("/");
      let currentNode = root;
      for (let index in parts) {
        const currentCategory = parts.slice(0, parseInt(index) + 1).join("/");
        let childNode = currentNode.children.find(
          (child) => child._id === currentCategory
        );
        if (!childNode) {
          childNode = {
            _id: currentCategory,
            children: [] as CategoryNode[],
          };
          currentNode.children.push(childNode);
        }
        currentNode = childNode;
      }
    }
    // sort tree
    sortTree(root as QTreeNode);
    return root.children;
  } catch (error) {
    console.log(error);
    return [{ _id: "library", children: [] }];
  }
}

/**
 * Update categories in projects
 * @param {string} oldCategory
 * @param {string} newCategory
 */
export async function updateCategory(oldCategory: string, newCategory: string) {
  await categoryFileAGUD.update(oldCategory, newCategory);
  await categorySQLAGUD.update(oldCategory, newCategory);
}

/**
 * Delete a category (and its subcategories) from associated projects
 * @param {string} category
 */
export async function deleteCategory(category: string) {
  await categoryFileAGUD.delete(category);
  await categorySQLAGUD.delete(category);
}
