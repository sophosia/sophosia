import { exists, readDir, readTextFile, removeDir } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";
import { i18n } from "src/boot/i18n";
import { saveNote } from "src/backend/note";
import { authorToString } from "src/backend/utils";
import { db } from "../jsondb";
import { Project } from "../models";
const { t } = i18n.global;

/******************************************
 * migrate project metas v0.13.0 to v0.14.0
 *****************************************/
/**
 * Move project metas
 * from storagePath/.sophosia/project/projectId.json
 * to storagePath/projectId/projectId.md
 */
export async function moveProjectMetaToProjectFolder() {
  console.log("v0.14.0 data migration: migrating project metas");
  const path = await join(db.config.storagePath, ".sophosia", "project");
  if (!(await exists(path))) return;
  const projectJsons = await readDir(path);

  for (const projectJson of projectJsons) {
    const project = JSON.parse(await readTextFile(projectJson.path)) as Project;
    const content = `
${t("note-is-auto-manged")}
# ${project.label}
${project.dataType === "project" && t("author")}: ${authorToString(
      project.author
    )}
${project.dataType === "project" && t("abstract")}: ${project.abstract || ""}

## meta
\`\`\`json
${JSON.stringify(project, null, 2)}
\`\`\`
`;
    await saveNote(`${project._id}/${project._id}.md`, content);
  }
  await removeDir(path, { recursive: true });
}
