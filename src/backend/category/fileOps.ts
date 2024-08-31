import { Project } from "../database";
import { getAllProjects, updateProject } from "../project";
import { getParentId } from "../utils";

export class CategoryFileAGUD {
  async getCategories(): Promise<string[]> {
    try {
      const projects = (await getAllProjects()) as Project[];
      // get unique category paths
      const uniqueCategories = [
        ...new Set(projects.flatMap((project) => project.categories)),
      ];
      return uniqueCategories;
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async update(oldCategory: string, newCategory: string): Promise<void> {
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

  async delete(category: string): Promise<void> {
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

  async moveInto(dragCategory: string, dropCategory: string) {
    try {
      const projects = await getAllProjects();
      for (const project of projects) {
        project.categories = project.categories.map((category) => {
          return category.startsWith(dragCategory)
            ? category.replace(getParentId(category), dropCategory)
            : category;
        });
        updateProject(project._id, project);
      }
    } catch (error) {
      console.log(error);
    }
  }
}

export const categoryFileAGUD = new CategoryFileAGUD();
