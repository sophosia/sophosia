/**
 * For drawing the graphs in cytoscape.
 */
import { EdgeUI, NodeUI, Node, Note, Project, db } from "../database";

export async function getItem(
  itemId: string
): Promise<Project | Note | undefined> {
  try {
    return (await db.get(itemId)) as Project | Note | undefined;
  } catch (error) {
    console.log(error);
  }
}

/**
 * Get nodes and edges that are conected to given item
 * Styles are set yet
 * @param noteId
 * @returns elements
 */
export async function getLinks(item: Project | Note) {
  try {
    const nodes = [
      {
        data: {
          id: item._id,
          label: item.label,
          type: item.dataType,
          parent: item.projectId,
        },
      },
    ] as NodeUI[];
    const edges = [] as EdgeUI[];
    const allNotes = (await db.getDocs("note")) as Note[];

    // forward links of the item
    let notes = [item];
    if (item.type === "project") {
      // if item is project, the forward links are the internal links in its notes
      notes = notes.concat(
        allNotes.filter((note) => note.projectId === item._id)
      );
    }
    for (let note of notes) {
      for (let link of note.links) {
        // link.type is default to undefined (missing) already
        let node = { data: link } as NodeUI;
        try {
          let forwardItem = await db.get(link.id);
          node.data.type = forwardItem.dataType as "project" | "note";
        } catch (error) {
          // if the note does not exist, it's missing
          node.data.type = undefined;
        }
        nodes.push(node);
        edges.push({
          data: {
            source: note._id,
            target: link.id,
          },
        });
      }
    }

    // backward links
    for (let note of allNotes) {
      if (note.links.map((link) => link.id).includes(item._id)) {
        nodes.push({
          data: {
            id: note._id,
            label: note.label,
            type: "note",
            parent: note.projectId,
          },
        });
        edges.push({
          data: {
            source: note._id,
            target: item._id,
          },
        });
      }
    }

    return { nodes, edges };
  } catch (error) {
    console.log(error);
    return { nodes: [], edges: [] };
  }
}

/**
 * Given nodes, get each's parent project as node
 * @param nodes
 * @returns parentNodes
 */
export async function getParents(nodes: NodeUI[]): Promise<NodeUI[]> {
  const parentIds = nodes.map((node) => node.data.parent);
  const parentNodes = [] as NodeUI[];
  const projects = (await db.getDocs("project")) as Project[];
  for (let project of projects) {
    if (parentIds.includes(project._id))
      parentNodes.push({
        data: { id: project._id, label: project.label, type: "project" },
      });
  }
  return parentNodes;
}
