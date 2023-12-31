import { sep, extname } from "@tauri-apps/api/path";
import { Author, db } from "../database";
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
 * Convert a path to folderId / noteId
 * storagePath/projectId/.../noteName.md -> projectId/.../noteName.md
 * storagePath/projectId/.../folderName -> projectId/.../folderName
 * @param path
 * @returns id
 */
export function pathToId(path: string) {
  return path.replace(db.config.storagePath + sep, "").replace(sep, "/");
}

/**
 * Convert a noteId / folerId to path
 * projectId/.../noteName.md -> storagePath/projectId/.../noteName.md
 * projectId/.../folderName -> storagePath/projectId/.../folderName
 * @param id
 * @returns path absolute path
 */
export function IdToPath(id: string) {
  return db.config.storagePath + sep + id.replace("/", sep);
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
