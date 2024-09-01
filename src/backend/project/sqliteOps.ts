import { Author, Project, sqldb } from "src/backend/database";

class ProjectSQLAGUD {
  /**
   * Insert/replace a project into sqlite database
   *
   * @param {Project} project
   * @returns {Promise<void>}
   */
  async addProject(project: Project): Promise<void> {
    await this.insertMeta(project);
    await this.insertTags(project._id, project.tags);
    await this.insertCategories(project._id, project.categories);
    await this.insertAuthors(project._id, project.author);
  }

  /**
   * Insert/replace meta of a project into metas table
   *
   * @param {Project} meta - meta to be inserted
   */
  async insertMeta(meta: Project) {
    await sqldb.execute("DELETE FROM metas WHERE _id = $1", [meta._id]);
    await sqldb.execute(
      `INSERT INTO metas (_id, type, citationKey, originalTitle, title, abstract, issued, publisher, containerTitle, volume, DOI, ISBN, ISSN, URL, favorite, timestampAdded, timestampModified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        meta._id,
        meta.type,
        meta["citation-key"],
        meta.title,
        meta["original-title"],
        meta.abstract,
        meta.issued,
        meta.publisher,
        meta["container-title"],
        meta.volume,
        meta.DOI,
        meta.ISBN,
        meta.URL,
        meta.favorite,
        meta.timestampAdded,
        meta.timestampModified,
      ]
    );
  }

  /**
   * Insert/replace authors into authors table and insert relations of authors to a project
   *
   * @param {string} projectId - id to the meta
   * @param {Author[]} authors - list of authors to be inserted
   */
  async insertAuthors(projectId: string, authors: Author[]) {
    for (const author of authors) {
      const given = author.given || "";
      const family = author.family || "";
      const literal = author.literal || "";
      const affiliation = author.literal || "";
      // insert the meta-author relation into authors table
      sqldb.execute(
        `INSERT INTO authors (projectId, given, family, literal, affiliation)
VALUES ($1, $2, $3, $4, $5)`,
        [projectId, given, family, literal, affiliation]
      );
    }
  }

  /**
   * Insert/replace tags of a project into the tags table
   *
   * @param {string} projectId - id of the meta
   * @param {string[]} tags - keywords of the proejcts
   */
  async insertTags(projectId: string, tags: string[]) {
    await sqldb.execute("DELETE FROM tags WHERE projectId = $1", [projectId]);
    for (const tag of tags) {
      sqldb.execute(
        `INSERT INTO tags (projectId, tag)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE projectId = $1 AND tag = $2)`,
        [projectId, tag]
      );
    }
  }

  /**
   * Insert/replace categories of a project into the categories table
   *
   * @param {string} projectId - id of the project
   * @param {any} categories - the categories the project belongs to
   */
  async insertCategories(projectId: string, categories: any) {
    await sqldb.execute("DELETE FROM categories WHERE projectId = $1", [
      projectId,
    ]);
    for (const category of categories) {
      sqldb.execute(
        `INSERT INTO categories (projectId, category)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE projectId = $1 AND category = $2)`,
        [projectId, category]
      );
    }
  }

  /**
   * Insert/replac text of PDF into contents table
   *
   * @param {string} projectId - id of the meta
   * @param {string} page - page number of the content
   * @param {string} content - content of specific page
   */
  async insertContent(projectId: string, page: string, content: string) {
    await sqldb.execute(
      "DELETE FROM contents WHERE projectId = $1 AND page = $2",
      [projectId, page]
    );
    await sqldb.execute(
      "INSERT INTO contents (projectId, page, content) VALUES ($1, $2, $3)",
      [projectId, page, content]
    );
  }

  async getProject(projectId: string): Promise<Project | undefined> {
    const projects = await sqldb.select<Project[]>(
      "SELECT * FROM metas WHERE _id = $1",
      [projectId]
    );
    if (!projects) return;
    const authors =
      (await sqldb.select<Author[]>(
        "SELECT given, family, literal, affiliation FROM authors WHERE projectId = $1",
        [projectId]
      )) || [];
    const categories =
      (await sqldb.select<string[]>(
        "SELECT category FROM categories WHERE projectId = $1",
        [projectId]
      )) || [];
    const tags =
      (await sqldb.select<string[]>(
        "SELECT tag FROM tags WHERE projectId = $1",
        [projectId]
      )) || [];

    // put things together to form a project
    const project = projects[0];
    project.author = authors;
    project.categories = categories;
    project.tags = tags;
    return project;
  }

  async getProjects(
    category: string,
    includeSubCategory: boolean = false
  ): Promise<Project[]> {
    let results = [] as { projectId: string }[];
    if (includeSubCategory) {
      results =
        (await sqldb.select<{ projectId: string }[]>(
          "SELECT projectId FROM categories WHERE category LIKE $1",
          [`${category}%`]
        )) || [];
    } else {
      results =
        (await sqldb.select<{ projectId: string }[]>(
          "SELECT projectId FROM categories WHERE category = $1",
          [category]
        )) || [];
    }
    const promises = results.map(
      async (result) => (await this.getProject(result.projectId))!
    );
    return await Promise.all(promises);
  }

  async getAllProjects() {
    return await this.getProjects("library");
  }

  async updateProject(projectId: string, props: Project) {
    const project = await this.getProject(projectId);
    if (!project) return;
    Object.assign(project, props);

    // delete rows and reinsert them
    await sqldb.execute("DELETE FROM metas WHERE _id = $1", [projectId]);
    await sqldb.execute("DELETE FROM authors WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM categories WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM tags WHERE projectId = $1", [projectId]);
    await this.addProject(project);
    // update projectId in the following tables if the projectId is changed
    if (projectId !== project._id) {
      await sqldb.execute(
        "UPDATE annotations SET projectId = $1  WHERE projectId = $2",
        [project._id, projectId]
      );
      await sqldb.execute(
        "UPDATE notes SET projectId = $1  WHERE projectId = $2",
        [project._id, projectId]
      );
      await sqldb.execute(
        `
UPDATE links
SET source = CASE WHEN source = $1 THEN $2 ELSE source END,
    target = CASE WHEN target = $1 THEN $2 ELSE target END
WHERE source = $1 OR target = $1`,
        [projectId, project._id]
      );
      await sqldb.execute(
        "UPDATE contents SET projectId = $1  WHERE projectId = $2",
        [project._id, projectId]
      );
    }
  }

  async deleteProject(projectId: string) {
    await sqldb.execute("DELETE FROM metas WHERE _id = $1", [projectId]);
    await sqldb.execute("DELETE FROM authors WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM categories WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM tags WHERE projectId = $1", [projectId]);
    await sqldb.execute("DELETE FROM contents WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM annotations WHERE projectId = $1", [
      projectId,
    ]);
    await sqldb.execute("DELETE FROM notes WHERE projectId = $1", [projectId]);
    await sqldb.execute("DELETE FROM links WHERE source = $1 OR target = $1", [
      projectId,
    ]);
  }
}

export const projectSQLAGUD = new ProjectSQLAGUD();
