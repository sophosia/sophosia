/**
 * For drawing the graphs in cytoscape.
 */
import { Edge, EdgeUI, NodeUI, Project, db, idb } from "../database";
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
  for (const link of links) {
    // create nodes
    if (!uniqueIds.includes(link.source)) {
      uniqueIds.push(link.source);
      let splits = link.source.split("/");
      let parent = splits[0];
      let label = splits.slice(1).join("/");
      nodes.push({
        data: {
          id: link.source,
          label: label,
          type: "note",
          parent: parent,
        },
      });

      // push its parent node
      if (!uniqueIds.includes(parent)) {
        uniqueIds.push(parent);
        let project = (await getProject(parent)) as Project;
        nodes.push({
          data: {
            id: project._id,
            label: project.label,
            type: "project",
          },
        });
      }
    }

    if (!uniqueIds.includes(link.target)) {
      uniqueIds.push(link.target);
      let isNote = link.target.includes("/");
      let splits = link.target.split("/");
      let parent = isNote ? splits[0] : undefined;
      let label = isNote
        ? splits.slice(1).join("/")
        : ((await getProject(parent as string)) as Project).label;
      let type: "note" | "project" | undefined;
      // see if the target exists
      if (!(await itemExists(link.target))) type = undefined;
      else if (isNote) type = "note";
      else type = "project";

      nodes.push({
        data: {
          id: link.target,
          label: label,
          type: type,
          parent: parent,
        },
      });

      // push its parent node
      if (parent && !uniqueIds.includes(parent)) {
        uniqueIds.push(parent);
        let project = (await getProject(parent)) as Project;
        nodes.push({
          data: {
            id: project._id,
            label: project.label,
            type: "project",
          },
        });
      }
    }

    // create edge
    edges.push({
      data: {
        source: link.source,
        target: link.target,
      },
    });
  }

  return { nodes, edges };
}
