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
      sqldb.execute(
        "UPDATE categories SET category = REPLACE(category, $1, $2)",
        [oldCategory, newCategory]
      );
    } catch (error) {
      console.log(error);
    }
  }

  async delete(category: string): Promise<void> {
    try {
      sqldb.execute("DELETE FROM categories WHERE category LIKE '$1%'", [
        category,
      ]);
    } catch (error) {
      console.log(error);
    }
  }
}

export const categorySQLAGUD = new CategorySQLAGUD();
