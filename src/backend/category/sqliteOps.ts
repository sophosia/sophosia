import { sqldb } from "../database";

class CategorySQLAGUD {
  async getCategories(): Promise<string[]> {
    try {
      const results =
        (await sqldb.select<{ category: string }[]>(
          "SELECT DISTINCT category FROM categories"
        )) || [];
      return results.map((result) => result.category);
    } catch (error) {
      console.log(error);
      return [];
    }
  }

  async update(oldCategory: string, newCategory: string): Promise<void> {
    try {
      sqldb.execute("UPDATE categories SET category = $1 WHERE category = $2", [
        newCategory,
        oldCategory,
      ]);
    } catch (error) {
      console.log(error);
    }
  }

  async delete(category: string): Promise<void> {
    try {
      sqldb.execute("DELETE FROM categories WHERE category = $1", [category]);
    } catch (error) {
      console.log(error);
    }
  }

  async moveInto(dragCategory: string, dropCategory: string) {
    try {
      sqldb.execute(
        "UPDATE categories SET category = REPLACE(category, $1, $2)",
        [dragCategory, dropCategory]
      );
    } catch (error) {
      console.log(error);
    }
  }
}

export const categorySQLAGUD = new CategorySQLAGUD();
