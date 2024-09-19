import { Author, Project, SpecialCategory, sqldb } from "src/backend/database";
import { getTitle } from "../utils";
import { useSettingStore } from "src/stores/settingStore";
import { metadata } from "tauri-plugin-fs-extra-api";

interface ProjectData {
  _id: string;
  type: string;
  citationKey: string;
  originalTitle: string;
  title: string;
  abstract: string;
  issued: string;
  publisher: string;
  containerTitle: string;
  containerTitleShort: string;
  volume: string;
  DOI: string;
  ISBN: string;
  ISSN: string;
  URL: string;
  favorite: string;
  timestampAdded: string;
  timestampModified: string;
  tags: string;
  categories: string;
  authors: string;
}

class ProjectSQLAGUD {
  /**
   * Insert/replace a project into sqlite database
   *
   * @param {Project} project
   * @returns {Promise<void>}
   */
  async addProject(project: Project): Promise<void> {
    console.log("project", project);
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
      `INSERT INTO metas (_id, type, citationKey, originalTitle, title, abstract, issued, publisher, containerTitle, containerTitleShort, volume, DOI, ISBN, ISSN, URL, favorite, timestampAdded, timestampModified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        meta._id,
        meta.type,
        meta["citation-key"],
        meta["original-title"],
        meta.title,
        meta.abstract,
        meta.issued,
        meta.publisher,
        meta["container-title"],
        meta["container-title-short"],
        meta.volume,
        meta.DOI,
        meta.ISBN,
        meta.ISSN,
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
      await sqldb.execute(
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
    try {
      const projects = await sqldb.select<Project[]>(
        "SELECT * FROM metas WHERE _id = $1",
        [projectId]
      );
      if (!projects || projects.length == 0) return;
      const authors =
        (await sqldb.select<Author[]>(
          "SELECT given, family, literal, affiliation FROM authors WHERE projectId = $1",
          [projectId]
        )) || [];
      const categoryResults =
        (await sqldb.select<{ category: string }[]>(
          "SELECT category FROM categories WHERE projectId = $1",
          [projectId]
        )) || [];
      const tagResults =
        (await sqldb.select<{ category: string }[]>(
          "SELECT tag FROM tags WHERE projectId = $1",
          [projectId]
        )) || [];

      // put things together to form a project
      const project = projects[0];
      project.dataType = "project";
      const settingsStore = useSettingStore();
      project.label = getTitle(project, settingsStore.showTranslatedTitle);
      project.author = authors;
      project.favorite = JSON.parse(
        (project.favorite as unknown as string) || "false"
      );
      project.issued = JSON.parse(project.issued as unknown as string);
      project.categories = categoryResults.map((result) => result.category);
      project.tags = tagResults.map((result) => result.category);
      return project;
    } catch (error) {
      console.log(error);
    }
  }

  async getProjects(category: string): Promise<Project[]> {
    try {
      let query: string;
      let params: any[] = [];

      switch (category) {
        case SpecialCategory.FAVORITES:
          query = `
SELECT
  *,
  GROUP_CONCAT(tags.tag) AS tags,
  GROUP_CONCAT(categories.category) AS categories,
  GROUP_CONCAT(authors.given || ' ' || authors.family, ', ') AS authors
FROM metas
LEFT JOIN tags ON metas._id = tags.projectId
LEFT JOIN categories ON metas._id = categories.projectId
LEFT JOIN authors ON metas._id = authors.projectId
WHERE metas.favorite = "true"
GROUP BY metas._id
      `;
          break;
        case "added":
          // get entries within last 30 days
          const thirtyDaysAgo = new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000
          ).getTime();
          query = `
SELECT
  *,
  GROUP_CONCAT(tags.tag) AS tags,
  GROUP_CONCAT(categories.category) AS categories,
  GROUP_CONCAT(authors.given || ' ' || authors.family, ', ') AS authors
FROM metas
LEFT JOIN tags ON metas._id = tags.projectId
LEFT JOIN categories ON metas._id = categories.projectId
LEFT JOIN authors ON metas._id = authors.projectId
WHERE metas.timestampAdded >= $1
GROUP BY metas._id
      `;
          params = [thirtyDaysAgo];
          break;

        default:
          query = `
SELECT
  *,
  GROUP_CONCAT(tags.tag, '|') AS tags,
  GROUP_CONCAT(categories.category, '|') AS categories,
  GROUP_CONCAT(authors.family || ',' || authors.given, '|') AS authors
FROM metas
LEFT JOIN tags ON metas._id = tags.projectId
LEFT JOIN categories ON metas._id = categories.projectId
LEFT JOIN authors ON metas._id = authors.projectId
WHERE categories.category = $1
GROUP BY metas._id
      `;
          params = [category];
          break;
      }

      const rows = (await sqldb.select<ProjectData[]>(query, params)) || [];
      return rows.map((row) => ({
        _id: row._id,
        id: row._id,
        dataType: "project",
        type: row.type,
        "citation-key": row.citationKey,
        "original-title":
          row.originalTitle && row.originalTitle !== "[]"
            ? row.originalTitle
            : "",
        title: row.title,
        label: row.title,
        abstract: row.abstract,
        issued: JSON.parse(row.issued),
        publisher: row.publisher,
        "container-title": row.containerTitle,
        "container-title-short": row.containerTitleShort,
        volume: parseInt(row.volume),
        DOI: row.DOI,
        ISBN: row.ISBN,
        ISSN: row.ISSN,
        URL: row.URL,
        favorite: row.favorite === "true",
        timestampAdded: parseInt(row.timestampAdded),
        timestampModified: parseInt(row.timestampModified),
        tags: row.tags ? row.tags.split("|") : [],
        categories: row.categories ? row.categories.split("|") : [],
        author: row.authors.split("|").map((name) => {
          const [family, given] = name.split(",");
          return { family, given };
        }),
        children: [],
        path: "",
      }));
    } catch (error) {
      console.log(error);
      return [];
    }
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
