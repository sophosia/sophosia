import { extname, sep } from "@tauri-apps/api/path";
import { Author, Meta, db } from "../database";
interface TreeNode {
  label: string;
  children?: (string | TreeNode)[];
}
/**
 * Sort children of a tree node by labels
 * @param root - the root treenode
 */
export function sortTree(root: TreeNode) {
  if (root.children === undefined) return;

  if (root.children.length > 1) {
    root.children = root.children.sort((a, b) =>
      (a as TreeNode).label > (b as TreeNode).label
        ? 1
        : (b as TreeNode).label > (a as TreeNode).label
        ? -1
        : 0
    );
    for (let child of root.children) sortTree(child as TreeNode);
  }
}

/**
 * Convert array of author objects to string
 * @param authors
 */
export function authorToString(authors: Author[] | undefined) {
  if (!!!authors?.length) return "";

  let names = [];
  for (let author of authors) {
    if (!!!author) continue;
    if (!!author.literal) names.push(author.literal);
    else names.push(`${author.given} ${author.family}`);
  }
  return names.join(", ");
}

/**
 * Get the correct title from meta
 * If meta contains translated title and showTranslatedTitle is True, return translated title
 * @param meta - meta data
 * @param showTranslatedTitle - determines whether or not to show translated title
 * @returns title - the desired title
 */
export function getTitle(meta: Meta, showTranslatedTitle: boolean) {
  if (
    !showTranslatedTitle &&
    meta["original-title"] &&
    !Array.isArray(meta["original-title"])
  )
    return meta["original-title"];
  else return meta.title;
}
/**
 * Convert a path to folderId / noteId
 * storagePath/projectId/.../noteName.md -> projectId/.../noteName.md
 * storagePath/projectId/.../folderName -> projectId/.../folderName
 * @param path
 * @returns id
 */
export function pathToId(path: string) {
  const _sep = process.env.TEST ? "/" : sep;
  return path.replace(db.config.storagePath + _sep, "").replace(_sep, "/");
}

/**
 * Convert a noteId / folerId to path
 * projectId/.../noteName.md -> storagePath/projectId/.../noteName.md
 * projectId/.../folderName -> storagePath/projectId/.../folderName
 * @param id
 * @returns path absolute path
 */
export function idToPath(id: string) {
  const _sep = process.env.TEST ? "/" : sep;
  return db.config.storagePath + _sep + id.replace("/", _sep);
}

export async function oldToNewId(oldId: string, newLabel: string) {
  let ext = "";
  try {
    ext = await extname(oldId);
  } catch (error) {
    // has no extension, oldId is a folderId do nothing
  }

  try {
    await extname(newLabel);
  } catch (error) {
    // newLabel has no extension
    // we add the extension to it (ext can be empty)
    if (ext) newLabel += `.${ext}`;
  }
  const splits = oldId.split("/");
  splits[splits.length - 1] = newLabel;
  return splits.join("/");
}

/**
 * Convert all %20 to spaces
 * @param link
 * @returns
 */
export function linkToId(link: string): string {
  return link.replace("sophosia://open-item/", "").replaceAll("%20", " ");
}

/**
 * Convert all spaces to %20
 * @param link
 * @returns
 */
export function idToLink(id: string): string {
  return id.replaceAll(" ", "%20");
}

export function getDataType(id: string): string {
  if (id.includes("/")) return "note";
  else if (id.startsWith("SP")) return "project";
  else if (id.startsWith("SA")) return "pdfAnnotation";
  else return "project";
}

/**
 * A simple, *insecure* 32-bit hash that's short, fast, and has no dependencies.
 * Useful to generate unique id.
 * Output is always 7 characters.
 * Loosely based on the Java version; see
 * https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
 *
 * @param {string} msg - The messeage to be hashed
 * @returns {string} hash - The hash value with only 0-9A-Z and with length 7
 */
export function simpleHash(msg: string): string {
  let hash = 0;
  for (let i = 0; i < msg.length; i++) {
    const char = msg.charCodeAt(i);
    hash = (hash << 5) - hash + char;
  }
  // Convert to 32bit unsigned integer in base 36 and pad with "0" to ensure length is 7.
  return (hash >>> 0).toString(36).padStart(7, "0").toUpperCase();
}
