import { Author, Project, sqldb } from "src/backend/database";

/**********************************
 * Insert / Update project
 **********************************/

/**
 * Insert/replace a project into sqlite database
 *
 * @param {Project} project
 * @returns {Promise<void>}
 */
export async function insertProject(project: Project): Promise<void> {
  insertMeta(project);
  insertTags(project._id, project.tags);
  insertCategories(project._id, project.categories);
  insertAuthors(project._id, project.author);
}

/**
 * Insert/replace meta of a project into metas table
 *
 * @param {Project} meta - meta to be inserted
 */
export async function insertMeta(meta: Project) {
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
export async function insertAuthors(projectId: string, authors: Author[]) {
  await sqldb.execute("DELETE FROM authors WHERE projectId = $1", [projectId]);
  for (const author of authors) {
    const given = author.given || "";
    const family = author.family || "";
    const literal = author.literal || "";
    const affiliation = author.literal || "";
    // insert the meta-author relation into authors table
    sqldb.execute(
      `INSERT INTO authors (projectId, given, family, literal, affiliation)
SELECT $1, $2, $3, $4, $5
WHERE NOT EXISTS (SELECT 1 FROM authors WHERE projectId = $1)`,
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
export async function insertTags(projectId: string, tags: string[]) {
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
export async function insertCategories(projectId: string, categories: any) {
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
export async function insertContent(
  projectId: string,
  page: string,
  content: string
) {
  await sqldb.execute("DELETE FROM contents WHERE projectId = $1", [projectId]);
  await sqldb.execute(
    "INSERT INTO contents (projectId, page, content) VALUES ($1, $2, $3)",
    [projectId, page, content]
  );
}

/**********************************
 * delete project(s)
 **********************************/
/**
 * Delete all associated datas of a project from sqlite database
 *
 * @param {string} projectId
 */
export async function deleteProject(projectId: string) {
  sqldb.execute("DELETE FROM metas WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM authors WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM categories WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM tags WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM contents WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM annotations WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM notes WHERE projectId = $1", [projectId]);
  sqldb.execute("DELETE FROM links WHERE source = $1 OR target = $1", [
    projectId,
  ]);
}

/**********************************
 * Get project(s)
 **********************************/
export async function getProject(projectId: string) {
  const projects = await sqldb.select<Project[]>(
    "SELECT * FROM metas WHERE projectId = $1",
    [projectId]
  );
  if (!projects) return;
  const authors =
    (await sqldb.select<Author[]>(
      "SELECT * FROM authors WHERE projectId = $1",
      [projectId]
    )) || [];
  const categories =
    (await sqldb.select<string[]>(
      "SELECT * FROM categories WHERE projectId = $1",
      [projectId]
    )) || [];
  const tags =
    (await sqldb.select<string[]>("SELECT * FROM tags WHERE projectId = $1", [
      projectId,
    ])) || [];

  const project = projects[0];
}

export async function getProjects(category: string) {}
