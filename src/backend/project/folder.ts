import { Project, CategoryNode, SpecialCategory } from "../database";
import { getAllProjects, updateProject } from "./project";
import { sortTree } from "./utils";

/**
 * Get the category tree
 *
 * @returns {CategoryNode[]} categoryTree - The category tree
 *
 * @example
 * Given a category tree,
 * library
 *    |-- a
 *    |-- b
 *        |- c
 *
 * the returned data is
 * [
 *  {
 *    id: "library",
 *    children:
 *      [
 *        {
 *          id:"a"
 *        },
 *        {
 *          id: "b",
 *          children:
 *            [
 *              {
 *                id: "c"
 *              }
 *            ]
 *        }
 *      ]
 *   }
 * ]
 *
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  try {
    const projects = (await getAllProjects()) as Project[];
    // get unique category paths
    const categories = [
      ...new Set(projects.flatMap((project) => project.categories)),
    ];

    const root = { _id: "root", children: [] } as CategoryNode;
    for (const category of categories) {
      const parts = category.split("/");
      let currentNode = root;
      for (const [index, part] of parts.entries()) {
        const currentCategory = parts.slice(0, index + 1).join("/");
        let childNode = currentNode.children.find(
          (child) => child._id === part
        );
        if (!childNode) {
          childNode = { _id: currentCategory, children: [] as CategoryNode[] };
          currentNode.children.push(childNode);
        }
        currentNode = childNode;
      }
    }
    sortTree(root);
    return root.children;
  } catch (error) {
    console.log(error);
    return [{ _id: SpecialCategory.LIBRARY, children: [] }];
  }
}

/**
 * Update categories in projects
 * @param {string} oldCategory
 * @param {string} newCategory
 */
export async function updateCategory(oldCategory: string, newCategory: string) {
  try {
    const projects = (await getAllProjects()) as Project[];
    for (const project of projects) {
      project.categories = project.categories.map((category) =>
        category === oldCategory ? newCategory : category
      );
      updateProject(project._id, project);
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * Delete a category (and its subcategories) from associated projects
 * @param {string} category
 */
export async function deleteCategory(category: string) {
  try {
    const projects = (await getAllProjects()) as Project[];
    for (const project of projects) {
      project.categories = project.categories.filter(
        (cat) => !cat.startsWith(category)
      );
      updateProject(project._id, project);
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Extract the label of a category path
 *
 * @example
 * library/plasma physics -> plasma physics
 *
 * @param {string} category
 * @returns {string} label
 */
export function getCategoryLabel(category: string): string {
  return category.split("/").at(-1)!;
}

/**
 * Get the parent category of a given category
 * @param {string} category
 * @returns parentCategory
 */
export function getParentCategory(category: string): string {
  return category.split("/").slice(0, -1).join("/");
}

/**
 * Move the dragFolder into the dropFolder
 * @param {string} dragCategory
 * @param {string} dropCategory
 */
export async function moveCategoryInto(
  dragCategory: string,
  dropCategory: string
) {
  try {
    const projects = await getAllProjects();
    for (const project of projects) {
      project.categories = project.categories.map((category) => {
        return category.startsWith(dragCategory)
          ? category.replace(getParentCategory(category), dropCategory)
          : category;
      });
      updateProject(project._id, project);
    }
  } catch (error) {
    console.log(error);
  }
}
