/**
 * For drawing the graphs in cytoscape.
 */
import {
  AnnotationData,
  Edge,
  EdgeUI,
  NodeUI,
  Note,
  Project,
  db,
  idb,
} from "../database";
import { getNote, getNotes } from "./note";
import { getProject } from "./project";
import { getDataType } from "./utils";

/**
 * Update links of a note
 * @param noteId
 * @param links new links of a note
 */
export async function updateLinks(noteId: string, links: Edge[]) {
  try {
    const keys = await idb.getAllKeysFromIndex("links", "source", noteId);
    const tx = idb.transaction("links", "readwrite");
    const promises = [] as Promise<void | IDBValidKey>[];
    // delete all old links
    if (keys.length > 0)
      promises.push(...keys.map((key) => tx.store.delete(key)));
    // add all new links
    promises.push(...links.map((link) => tx.store.put(link)));
    promises.push(tx.done);
    await Promise.all(promises);
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get forward links of an item
 * @param itemId
 * @returns links
 */
export async function getForwardLinks(itemId: string): Promise<Edge[]> {
  const links = [] as Edge[];

  // get the current Item
  const dataType = getDataType(itemId);
  const item =
    dataType === "note" ? await getNote(itemId) : await getProject(itemId);

  if (!item) return links;

  if (item.dataType === "note") {
    // forward links from the note
    links.push(...(await idb.getAllFromIndex("links", "source", item._id)));
  } else {
    // forward links of a project is the collection of forward links of its notes
    const notes = await getNotes(item._id);
    for (const note of notes) {
      links.push(...(await idb.getAllFromIndex("links", "source", note._id)));
    }
  }

  return links;
}

/**
 * Given an itemId, return the node with this id and/or the parent of this item
 * @param itemId
 * @returns NodeUI[]
 */
async function getCurrentAndOrParentNodes(
  itemId: string | undefined
): Promise<NodeUI[]> {
  const nodes = [] as NodeUI[];
  if (!itemId) return nodes;
  let parent: string | undefined;
  let label: string;
  let type: "project" | "note" | "annotation";
  const dataType = getDataType(itemId);
  if (dataType === "note") {
    const splits = itemId.split("/");
    parent = splits[0];
    label = splits[splits.length - 1].replace("%20", " ");
    type = "note";
  } else if (dataType === "pdfAnnotation") {
    let item = (await db.get(itemId)) as AnnotationData;
    parent = item.projectId;
    label = item.type;
    type = "annotation";
  } else {
    let item = (await getProject(itemId)) as Project;
    parent = undefined;
    label = item.label;
    type = "project";

    // grab its notes even if its notes have no connections
    const notes = (await getNotes(itemId)) as Note[];
    for (const note of notes) {
      nodes.push({
        data: {
          id: note._id,
          label: note.label,
          type: note.dataType,
          parent: note.projectId,
        },
      });
    }
  }
  nodes.push({
    data: {
      id: itemId,
      label: label,
      type: type,
      parent: parent,
    },
  });
  nodes.push(...(await getCurrentAndOrParentNodes(parent)));
  return nodes;
}

/**
 * Given a Project or a Note, create a graph with nodes connected with it
 * @param item A project or a note
 * @returns returns {nodes, edges}
 */
export async function getGraph(itemId: string) {
  const nodes = [] as NodeUI[];
  const edges = [] as EdgeUI[];

  const links = [] as Edge[];
  links.push(...(await getForwardLinks(itemId)));
  // backward links
  links.push(...(await idb.getAllFromIndex("links", "target", itemId)));

  // create graph
  const uniqueIds = [] as string[];
  // add current node and / or its parent
  const currentAndOrParentNodes = await getCurrentAndOrParentNodes(itemId);
  for (const node of currentAndOrParentNodes) {
    if (!uniqueIds.includes(node.data.id)) {
      nodes.push(node);
      uniqueIds.push(node.data.id);
    }
  }
  for (const link of links) {
    // create edge
    edges.push({
      data: {
        source: link.source,
        target: link.target,
      },
    });
    // add nodes and /or their parent nodes connected the edge
    let sourceAndOrParentNodes = await getCurrentAndOrParentNodes(link.source);
    let targetAndOrParentNodes = await getCurrentAndOrParentNodes(link.target);
    for (const node of sourceAndOrParentNodes.concat(targetAndOrParentNodes)) {
      if (!uniqueIds.includes(node.data.id)) {
        nodes.push(node);
        uniqueIds.push(node.data.id);
      }
    }
  }
  return { nodes, edges };
}
