/**
 * For drawing the graphs in cytoscape.
 */
import { Edge, EdgeUI, NodeUI, Note, Project, db, idb } from "../database";
import { getNote, getNotes } from "./note";
import { getProject } from "./project";
import { exists } from "@tauri-apps/api/fs";
import { join } from "@tauri-apps/api/path";

async function itemExists(itemId: string) {
  const item = itemId.includes("/")
    ? await getNote(itemId)
    : await getProject(itemId);
  if (!item) return false;
  else if (item.dataType === "note") return await exists(item.path);
  else return await exists(await join(db.storagePath, item._id));
}

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
  const item = itemId.includes("/")
    ? await getNote(itemId)
    : await getProject(itemId);

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
  const isNote = itemId.includes("/");
  const splits = itemId.split("/");
  const parent = isNote ? splits[0] : undefined;
  const item = isNote
    ? ((await getNote(itemId)) as Note)
    : ((await getProject(itemId)) as Project);
  const label = item.label;
  const type = isNote ? "note" : "project";
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
  let currentAndOrParentNodes = await getCurrentAndOrParentNodes(itemId);
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

// export async function getGraph(itemId: string) {
//   const nodes = [] as NodeUI[];
//   const edges = [] as EdgeUI[];

//   const links = [] as Edge[];
//   links.push(...(await getForwardLinks(itemId)));
//   // backward links
//   links.push(...(await idb.getAllFromIndex("links", "target", itemId)));

//   // create graph
//   // add current node
//   let isNote = itemId.includes("/");
//   let splits = itemId.split("/");
//   let parent = isNote ? splits[0] : undefined;
//   let label = splits.slice(1).join("/");
//   let project: Project;
//   if (isNote && parent) {
//     if (splits[splits.length - 1] === parent + ".md") label = "Overview.md";
//     project = (await getProject(parent)) as Project;
//   } else {
//     project = (await getProject(itemId)) as Project;
//     label = project.label;
//   }
//   nodes.push({
//     data: {
//       id: itemId,
//       label: label,
//       type: "note",
//       parent: parent,
//     },
//   });
//   // add parent node if it has
//   if (parent) {
//     nodes.push({ //       data: {
//         id: parent,
//         label: project.label,
//         type: "project",
//       },
//     });
//   }

//   const uniqueIds = [itemId] as string[];
//   for (const link of links) {
//     console.log(
//       `nodes of ${link.source} are ${await getAssociatedNodes(link.source)}`
//     );
//     // create nodes
//     if (!uniqueIds.includes(link.source)) {
//       uniqueIds.push(link.source);
//       let splits = link.source.split("/");
//       let parent = splits[0];
//       let label = splits.slice(1).join("/");
//       nodes.push({
//         data: {
//           id: link.source,
//           label: label,
//           type: "note",
//           parent: parent,
//         },
//       });

//       // push its parent node
//       if (!uniqueIds.includes(parent)) {
//         uniqueIds.push(parent);
//         let project = (await getProject(parent)) as Project;
//         nodes.push({
//           data: {
//             id: project._id,
//             label: project.label,
//             type: "project",
//           },
//         });
//       }
//     }

//     if (!uniqueIds.includes(link.target)) {
//       uniqueIds.push(link.target);
//       let isNote = link.target.includes("/");
//       let splits = link.target.split("/");
//       let parent = isNote ? splits[0] : undefined;
//       let label = isNote
//         ? splits.slice(1).join("/")
//         : ((await getProject(link.target)) as Project).label;
//       let type: "note" | "project" | undefined;
//       // see if the target exists
//       if (!(await itemExists(link.target))) type = undefined;
//       else if (isNote) type = "note";
//       else type = "project";

//       nodes.push({
//         data: {
//           id: link.target,
//           label: label,
//           type: type,
//           parent: parent,
//         },
//       });

//       // push its parent node
//       if (parent && !uniqueIds.includes(parent)) {
//         uniqueIds.push(parent);
//         let project = (await getProject(parent)) as Project;
//         console.log("another parent project", project);
//         nodes.push({
//           data: {
//             id: project._id,
//             label: project.label,
//             type: "project",
//           },
//         });
//       }
//     }

//     // create edge
//     edges.push({
//       data: {
//         source: link.source,
//         target: link.target,
//       },
//     });
//   }

//   return { nodes, edges };
// }
