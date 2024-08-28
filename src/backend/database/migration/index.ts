import { moveProjectMetaToProjectFolder } from "./v0.13.0tov0.14.0";
import { changeFolderIdToCategoryPath } from "./v0.16.3tov0.17.0";

export async function migrate() {
  await moveProjectMetaToProjectFolder();
  await changeFolderIdToCategoryPath();
}
