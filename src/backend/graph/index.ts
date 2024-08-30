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
  sqldb,
} from "../database";
import { getNotes } from "../note";
import { getProject } from "../project";
import { getDataType } from "../utils";

/**
 * Insert link into links table
 *
 * @param {Edge} link - an markdown link pointing to some other item
 */
export async function insertLink(link: Edge) {
  await sqldb.execute(
    "INSERT INTO links (source, target) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM links WHERE source = $1 AND target = $2)",
    [link.source, link.target]
  );
}

/**
 * Update outward links from a note
 *
 * @async
 * @param {string} noteId - The source
 * @param {string[]} targetIds - the outward links from noteId
 */
export async function updateForwardLinks(noteId: string, targetIds: string[]) {
  await sqldb.execute("DELETE FROM links WHERE source = $1", [noteId]);
  for (const target of targetIds)
    await sqldb.execute("INSERT INTO links (source, target) VALUES ($1, $2)", [
      noteId,
      target,
    ]);
}

/**
 * Get forward links from a note
 *
 * @param {string} noteId
 * @returns {Promise<Edge[]>} forwardLinks
 */
export async function getForwardLinks(noteId: string): Promise<Edge[]> {
  return (
    (await sqldb.select<Edge[]>("SELECT * FROM links WHERE source = $1", [
      noteId,
    ])) || []
  );
}

/**
 * Given a Project or a Note, create a graph with nodes connected with it
 * @param {string} itemId - The id of a project or a note
 * @returns {Promise<{nodes: Node[], edges: Edge[]}>} graph - Has nodes and edges
 */
export async function getGraph(
  itemId: string
): Promise<{ nodes: NodeUI[]; edges: EdgeUI[] }> {
  const nodes = [] as NodeUI[];
  const edges = [] as EdgeUI[];

  // create graph
  const uniqueIds = [] as string[];
  // add current node and / or its parent
  const currentCluter = await getNodeCluster(itemId);
  for (const node of currentCluter) {
    if (!uniqueIds.includes(node.data.id)) {
      nodes.push(node);
      uniqueIds.push(node.data.id);
    }
  }

  const edgeDatas =
    (await sqldb.select<Edge[]>(
      "SELECT * FROM links WHERE source = $1 OR target = $1",
      [itemId]
    )) || [];

  for (const data of edgeDatas) {
    // create edge
    edges.push({ data });
    // add nodes and /or their parent nodes connected the edge
    let sourceCluster = await getNodeCluster(data.source);
    let targetCluster = await getNodeCluster(data.target);
    for (const node of sourceCluster.concat(targetCluster)) {
      if (!uniqueIds.includes(node.data.id)) {
        nodes.push(node);
        uniqueIds.push(node.data.id);
      }
    }
  }

  // also get the parent nodes (projects) of notes
  return { nodes, edges };
}

/**
 * Given an itemId, return the cluster of nodes consists of the item itself, project and notes associated with item.
 *
 * @param {string} itemId
 * @returns {Promise<NodeUI[]>} nodes
 *
 * @example
 * project
 *    |-- notes
 *    |     |-- note1
 *    |     |-- note2
 *    |
 *    |-- annots
 *          |-- annot1
 *          |-- annot2
 *
 * getClusterNodes(project) -> [project, note1, note2]
 * getClusterNodes(note1) -> [project, note1, note2]
 * getClusterNodes(note2) -> [project, note1, note2]
 * getClusterNodes(annot1) -> [project, note1, note2, annot1]
 * getClusterNodes(annot2) -> [project, note1, note2, annot2]
 */
async function getNodeCluster(itemId: string | undefined): Promise<NodeUI[]> {
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
  nodes.push(...(await getNodeCluster(parent)));
  return nodes;
}
