import { moveProjectMetaToProjectFolder } from "./v0.13.0tov0.14.0";
import { changeFolderIdToCategoryPath } from "./v0.17.0tov0.18.0";

export async function migrate() {
  await moveProjectMetaToProjectFolder();
  await changeFolderIdToCategoryPath();
}
