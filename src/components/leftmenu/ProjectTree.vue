<template>
  <ExportDialog
    v-model:show="exportCitationDialog"
    @confirm="(format:any, options:any) => exportCitation(format, options)"
  />
  <q-tree
    ref="tree"
    dense
    no-transition
    no-selection-unset
    :no-nodes-label="$t('empty')"
    :nodes="projectStore.openedProjects"
    node-key="_id"
    selected-color="primary"
    v-model:selected="layoutStore.currentItemId"
    v-model:expanded="expanded"
  >
    <template v-slot:default-header="prop">
      <!-- use full-width so that click trailing empty space
        of the node still fires click event -->
      <!-- only note can drop into a project -->
      <div
        style="width: calc(100% - 23px)"
        class="row"
        :class="{
          dragover:
            !!dragoverNode &&
            dragoverNode == prop.node &&
            draggingNode != prop.node
        }"
        @click="selectItem(prop.node._id)"
        :draggable="prop.node.dataType !== 'project'"
        @dragstart="(e) => onDragStart(e, prop.node)"
        @dragover="(e) => onDragOver(e, prop.node)"
        @dragleave="(e) => onDragLeave(e, prop.node)"
        @drop="(e) => onDrop(e, prop.node)"
      >
        <ProjectMenu
          v-if="prop.node.dataType === 'project'"
          :projectId="prop.node._id"
          @showInExplorer="showInExplorer(prop.node)"
          @addNote="(noteType: NoteType) => addNode(prop.node._id, 'note', noteType)"
          @addFolder="addNode(prop.node._id, 'folder')"
          @exportCitation="showExportCitationDialog"
          @closeProject="closeProject(prop.node._id)"
          @copyId="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(prop.node._id);
            }
          "
          @copyAsLink="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(
                `[${generateCiteKey(prop.node)}](sophosia://open-item/${
                  prop.node._id
                })`
              );
            }
          "
        />
        <NoteMenu
          v-else-if="prop.node.dataType === 'note'"
          @showInExplorer="showInExplorer(prop.node)"
          @rename="setRenameNode(prop.node)"
          @delete="deleteNode(prop.node)"
          @copyId="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(prop.node._id);
            }
          "
          @copyAsLink="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(`[${prop.node._id}](${prop.node._id})`);
            }
          "
        />
        <FolderMenu
          v-else
          @showInExplorer="showInExplorer(prop.node)"
          @addNote="(noteType: NoteType) => addNode(prop.node._id, 'note', noteType)"
          @addFolder="addNode(prop.node._id, 'folder')"
          @renameFolder="setRenameNode(prop.node)"
          @deleteFolder="deleteNode(prop.node)"
        />

        <q-icon
          v-if="prop.node.dataType === 'project'"
          size="1.4rem"
          name="mdi-book-open-blank-variant"
        />
        <q-icon
          v-else-if="prop.node.dataType === 'folder'"
          size="1.4rem"
          :name="prop.expanded ? 'mdi-folder-open' : 'mdi-folder'"
        />
        <q-icon
          v-else-if="
            prop.node.dataType === 'note' &&
            prop.node.type === NoteType.EXCALIDRAW
          "
          size="1.4rem"
          name="img:icons/excalidraw.png"
        />
        <!-- markdown note -->
        <q-icon
          v-else
          size="1.4rem"
          name="mdi-language-markdown"
        />
        <!-- note icon has 1rem width -->
        <!-- input must have keypress.space.stop since space is default to expand row rather than space in text -->
        <div v-if="prop.node._id == renamingNodeId">
          <input
            style="width: calc(100% - 1.4rem)"
            v-model="prop.node.label"
            @input="checkDuplicate(prop.node)"
            @keydown.enter="renameNode"
            @blur="renameNode"
            @keypress.space.stop
            ref="renameInput"
          />
          <q-tooltip
            v-if="pathDuplicate"
            v-model="pathDuplicate"
            class="bg-red"
          >
            {{ $t("duplicate") }}
          </q-tooltip>
        </div>
        <!-- add item-id and type for access of drag source -->
        <div
          v-else
          style="width: calc(100% - 1.4rem); font-size: 1rem"
          class="ellipsis non-selectable"
          :item-id="prop.key"
          :type="prop.node.dataType"
        >
          {{
            prop.node.label === prop.node.projectId + ".md"
              ? "Overview.md"
              : prop.node.label
          }}
          <q-tooltip> ID: {{ prop.key }} </q-tooltip>
        </div>
      </div>
      <q-icon
        v-if="prop.node.dataType == 'project'"
        name="mdi-close"
        @click="closeProject(prop.key)"
      >
        <q-tooltip>
          <i18n-t keypath="close">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-tooltip>
      </q-icon>
    </template>
  </q-tree>
</template>
<script setup lang="ts">
import { inject, nextTick, onMounted, ref, watchEffect } from "vue";
import { QTree, copyToClipboard } from "quasar";
import {
  FolderOrNote,
  Note,
  NoteType,
  Page,
  Project
} from "src/backend/database";
// db
import { useStateStore } from "src/stores/appState";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { dirname, join } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api";
import { metadata } from "tauri-plugin-fs-extra-api";
import { idToPath, oldToNewId } from "src/backend/project/utils";
import { exportMeta } from "src/backend/project/meta";

//components
import NoteMenu from "./NoteMenu.vue";
import ProjectMenu from "./ProjectMenu.vue";
import FolderMenu from "./FolderMenu.vue";
import { getNotes } from "src/backend/project/note";
import { generateCiteKey } from "src/backend/project/meta";
import ExportDialog from "src/components/library/ExportDialog.vue";
import { getProject } from "src/backend/project/project";
import { useQuasar } from "quasar";

const stateStore = useStateStore();
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();

const tree = ref<QTree | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);
const renamingNodeId = ref("");
const renamingNodeType = ref<"folder" | "note">("folder");
const oldNoteName = ref("");
const pathDuplicate = ref(false);
const addingNode = ref(false);
const expanded = ref<string[]>([]);
const draggingNode = ref<FolderOrNote | null>(null);
const dragoverNode = ref<FolderOrNote | null>(null);
const enterTime = ref(0);
const exportCitationDialog = ref(false);
const project = ref<Project | null>(null);
const $q = useQuasar();

onMounted(async () => {
  // expand all projects
  expanded.value = Array.from(projectStore.openedProjects.map((p) => p._id));
});

watchEffect(() => {
  showInTree(layoutStore.currentItemId);
});

async function showExportCitationDialog(_projectid: Project) {
  exportCitationDialog.value = true;
  project.value = (await getProject(_projectid.toString())) as Project;
}

/**
 * Export project citation
 * @param format - citation.js supported format see - citation_styles
 * @param options - extra options
 */
async function exportCitation(
  format: string,
  options: { format?: string; template?: string }
) {
  if (project.value) {
    await exportMeta(format, options, undefined, project.value);

    $q.notify({
      message: "Copied",
      color: "blue",
      position: "bottom",
      timeout: 500
    });
  }
}

function selectItem(nodeId: string) {
  if (!tree.value) return;
  const node = tree.value.getNodeByKey(nodeId);
  console.log("node", node);
  layoutStore.currentItemId = node._id;
  if ((node.children?.length as number) > 0) expanded.value.push(node._id);
  if (node.dataType === "folder") return;

  stateStore.openItem(node._id);
}

async function showInExplorer(node: Project | Note) {
  const path = idToPath(node._id);
  await invoke("show_in_folder", {
    path: path
  });
}

function showInTree(nodeId: string) {
  const splits = nodeId.split("/");
  let folderId = splits[0];
  if (!expanded.value.includes(folderId)) expanded.value.push(folderId);
  for (let i = 1; i < splits.length - 1; i++) {
    folderId += `/${splits[i]}`;
    if (!expanded.value.includes(folderId)) expanded.value.push(folderId);
  }
}

async function closeProject(projectId: string) {
  // close all pages
  let project = projectStore.openedProjects.find((p) => p._id === projectId);
  if (project) {
    layoutStore.closePage(project._id);
    const notes = await getNotes(project._id);
    for (let node of notes) {
      await nextTick(); // do it slowly one by one
      layoutStore.closePage(node._id);
    }
  }

  // remove project from openedProjects
  projectStore.openedProjects = projectStore.openedProjects.filter(
    (p) => p._id !== projectId
  );

  await stateStore.saveAppState();
}

/**
 * Add a node with nodeType under the parent node
 * @param parentNodeId add node under this parent node
 * @param noteType (optional) the added note type
 */
async function addNode(
  parentNodeId: string,
  nodeType: "folder" | "note",
  noteType: NoteType = NoteType.MARKDOWN
) {
  const node = await projectStore.createNode(parentNodeId, nodeType, noteType);
  await projectStore.addNode(node);

  expanded.value.push(parentNodeId);
  addingNode.value = true;
  // rename node
  await nextTick(); // wait until ui updates
  setRenameNode(node);
}

function setRenameNode(node: FolderOrNote) {
  // set renaming note and show input
  renamingNodeId.value = node._id;
  renamingNodeType.value = node.dataType;
  oldNoteName.value = (
    tree.value!.getNodeByKey(renamingNodeId.value) as Note
  ).label;
  pathDuplicate.value = false;

  setTimeout(() => {
    // wait till input appears
    // focus onto the input and select the text
    let input = renameInput.value;
    if (!input) return;
    input.focus();
    input.select();
  }, 100);
}

async function renameNode() {
  const node = tree.value?.getNodeByKey(renamingNodeId.value) as FolderOrNote;
  if (!!!node) return;

  const oldNodeId = renamingNodeId.value;
  const newNodeId = await oldToNewId(oldNodeId, node.label);
  const newLabel = newNodeId.split("/").at(-1) as string;
  if (pathDuplicate.value) {
    node.label = oldNoteName.value;
  } else {
    if (renamingNodeType.value === "note") {
      // update window tab name
      layoutStore.renamePage(oldNodeId, {
        id: newNodeId,
        label: newLabel
      } as Page);
      await nextTick(); // wait until itemId changes in the page
    }
    await projectStore.renameNode(oldNodeId, newNodeId, renamingNodeType.value);

    node._id = newNodeId;
    node.label = newLabel;
  }

  if (addingNode.value) selectItem(node._id); // select after adding it
  else if (layoutStore.currentItemId === oldNodeId) selectItem(newNodeId); // select the currectly selected renaming node
  // if renaming other nodes that are not selected, no need to select them
  addingNode.value = false;
  renamingNodeId.value = "";
  oldNoteName.value = "";
}

async function checkDuplicate(note: Note) {
  if (!note) return;
  const extension = note.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  const path = await join(
    await dirname(idToPath(note._id)),
    note.label + extension
  );

  if ((await exists(path)) && path !== idToPath(note._id))
    pathDuplicate.value = true;
  else pathDuplicate.value = false;
}

async function deleteNode(node: FolderOrNote) {
  if (node.dataType === "note") {
    layoutStore.closePage(node._id);
  } else if (node.dataType === "folder") {
    const notes = await getNotes(node._id);
    for (const note of notes) layoutStore.closePage(note._id);
  }
  await projectStore.deleteNode(node._id, node.dataType);
  // select something else if the selectedItem is deleted
  if (node._id === projectStore.selected[0]?._id) {
    const projectId = node._id.split("/")[0];
    let project = projectStore.openedProjects.find((p) => p._id === projectId);

    if (project && project.children) {
      if (project.children.length == 0) {
        selectItem(project._id);
      } else {
        selectItem(project.children[0]._id);
      }
    }
  }
}

/**
 * Drag and Drop
 */
/**
 * On dragstart, set the dragging folder
 * @param e - dragevent
 * @param node - the folder user is dragging
 */
function onDragStart(e: DragEvent, node: FolderOrNote) {
  draggingNode.value = node;
  // need to set transfer data for some browsers to work
  e.dataTransfer?.setData("draggingNode", JSON.stringify(node));
}

/**
 * When dragging node enters the folder, highlight and expand it.
 * @param e - dragevent
 * @param node - the folder user is dragging over
 */
function onDragOver(e: DragEvent, node: FolderOrNote) {
  // enable drop on the node
  e.preventDefault();

  // hightlight the dragover folder
  dragoverNode.value = node;

  // expand the node if this function is called over many times
  enterTime.value++;
  if (enterTime.value > 15) {
    if (node._id in expanded.value) return;
    expanded.value.push(node._id);
  }
}

/**
 * When the dragging node leaves the folders, reset the timer
 * @param e
 * @param node
 */
function onDragLeave(e: DragEvent, node: FolderOrNote) {
  enterTime.value = 0;
  dragoverNode.value = null; // dehighlight the folder
}

/**
 * If draggedProjects is not empty, then we are dropping projects into folder
 * Otherwise we are dropping folder into another folder
 * @param e - dragevent
 * @param node - the folder / project user is dragging over
 */
async function onDrop(e: DragEvent, node: Project | FolderOrNote) {
  // record this first otherwise dragend event makes it null
  if (draggingNode.value === null || draggingNode.value == node) return;

  // move the dragging file / folder
  const dragId = draggingNode.value._id;
  const dragNodeMeta = await metadata(idToPath(dragId));
  const isDragNodeDir = dragNodeMeta.isDir;
  const dropNodeMeta = await metadata(idToPath(node._id));
  const isDropNodeDir = dropNodeMeta.isDir;
  if (!isDropNodeDir) return;
  const label = draggingNode.value.label;
  const newId = `${node._id}/${label}`;

  if (isDragNodeDir) {
    const notes = await getNotes(dragId);
    for (const note of notes) {
      const oldNoteId = note._id;
      const newNoteId = oldNoteId.replace(dragId, newId);
      layoutStore.renamePage(oldNoteId, {
        id: newNoteId,
        label: note.label
      } as Page);
    }
  } else {
    layoutStore.renamePage(dragId, {
      id: newId,
      label: label
    } as Page);
  }
  await nextTick(); // wait until the itemId is updated
  await projectStore.renameNode(
    dragId,
    newId,
    isDragNodeDir ? "folder" : "note"
  );

  // ui
  selectItem(newId);
  draggingNode.value = null;
  dragoverNode.value = null;
}
</script>
<style lang="scss" scoped>
.dragover {
  border: 1px solid aqua;
  background-color: rgba(0, 255, 255, 0.5);
}
</style>
