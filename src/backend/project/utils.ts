import { sep } from "@tauri-apps/api/path";
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
 * Convert a path to noteId
 * storagePath/projectId/.../noteName.md -> projectId/.../noteName.md
 * @param path
 * @returns noteId
 */
export function pathToId(path: string) {
  return path.replace(db.storagePath + sep, "").replace(sep, "/");
}

/**
 * Convert a noteId to path
 * projectId/.../noteName.md -> storagePath/projectId/.../noteName.md
 * @param noteId
 * @returns path absolute path
 */
export function IdToPath(noteId: string) {
  return db.storagePath + sep + noteId.replace("/", sep);
}
