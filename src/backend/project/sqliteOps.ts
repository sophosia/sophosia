import { Author, Project, sqldb } from "src/backend/database";

/**
 * Insert a project into sqlite database
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
 * Insert meta of a project into metas table
 *
 * @param {Project} meta - meta to be inserted
 */
export async function insertMeta(meta: Project) {
  if (meta["original-title"] && !Array.isArray(meta["original-title"])) {
    meta["translated-title"] = meta["title"];
    meta["title"] = meta["original-title"];
  }
  await sqldb.execute("DELETE FROM metas WHERE meta_id = $1", [meta._id]);
  await sqldb.execute(
    `INSERT INTO metas (meta_id, type, citation_key, title, translated_title, abstract, year, publisher, journal, volume, doi, isbn, url, favorite, timestamp_added, timestamp_modified)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      meta._id,
      meta.type || "",
      meta["citation-key"],
      meta.title,
      meta["translated-title"] || "",
      meta.abstract || "",
      meta.issued?.["date-parts"][0][0] || "",
      meta.publisher || "",
      meta["container-title"] || "",
      meta.volume || "",
      meta.DOI || "",
      meta.ISBN || "",
      meta.URL || "",
      !!meta.favorite,
      meta.timestampAdded,
      meta.timestampModified,
    ]
  );
}

/**
 * Insert authors into authors table and insert relations of authors to a project
 *
 * @param {string} projectId - id to the meta
 * @param {Author[]} authors - list of authors to be inserted
 */
export async function insertAuthors(projectId: string, authors: Author[]) {
  for (const author of authors) {
    const given = author.given || "";
    const family = author.family || "";
    const literal = author.literal || "";
    const affiliation = author.literal || "";
    // insert the meta-author relation into authors table
    sqldb.execute(
      `INSERT INTO authors (meta_id, given, family, literal, affiliation)
SELECT $1, $2, $3, $4, $5
WHERE NOT EXISTS (SELECT 1 FROM authors WHERE meta_id = $1)`,
      [projectId, given, family, literal, affiliation]
    );
  }
}

/**
 * Insert tags of a project into the tags table
 *
 * @param {string} projectId - id of the meta
 * @param {string[]} tags - keywords of the proejcts
 */
export async function insertTags(projectId: string, tags: string[]) {
  for (const tag of tags) {
    sqldb.execute(
      `INSERT INTO tags (meta_id, tag)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM tags WHERE meta_id = $1 AND tag = $2)`,
      [projectId, tag]
    );
  }
}

/**
 * Insert categories of a project into the categories table
 *
 * @param {string} projectId - id of the project
 * @param {any} categories - the categories the project belongs to
 */
export async function insertCategories(projectId: string, categories: any) {
  for (const category of categories) {
    sqldb.execute(
      `INSERT INTO categories (meta_id, category)
SELECT $1, $2
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE meta_id = $1 AND category = $2)`,
      [projectId, category]
    );
  }
}

/**
 * Insert text of PDF into contents table
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
  await sqldb.execute("DELETE FROM contents WHERE meta_id = $1", [projectId]);
  await sqldb.execute(
    "INSERT INTO contents (meta_id, page, content) VALUES ($1, $2, $3)",
    [projectId, page, content]
  );
}
