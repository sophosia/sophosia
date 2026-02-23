<template>
  <q-tree
    ref="tree"
    dense
    icon="keyboard_arrow_right"
    no-connectors
    no-transition
    no-selection-unset
    :nodes="projectStore.openedProjects"
    node-key="_id"
    selected-color="primary"
    v-model:expanded="expanded"
    :selected="treeSelected"
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
            draggingNode != prop.node,
        }"
        @click="selectItem(prop.node._id)"
        draggable="true"
        @dragstart="(e) => onDragStart(e, prop.node)"
        @dragover="(e) => onDragOver(e, prop.node)"
        @dragleave="(e) => onDragLeave(e, prop.node)"
        @drop="(e) => onDrop(e, prop.node)"
      >
        <ProjectMenu
          v-if="prop.node.dataType === 'project'"
          :projectId="prop.node._id"
          @showInExplorer="showInExplorer(prop.node)"
          @showInNewWindow="showInNewWindow(prop.node)"
          @addNote="(noteType: NodeType) => addNode(prop.node._id, 'note', noteType)"
          @addFolder="addNode(prop.node._id, 'folder')"
          @exportCitation="showExportCitationDialog(prop.node)"
          @closeProject="closeProject(prop.node._id)"
          @copyId="() => copyId(prop.node._id)"
          @copyAsLink="() => copyAsProjectLink(prop.node)"
        />
        <NoteMenu
          v-else-if="prop.node.dataType === 'note'"
          @showInExplorer="showInExplorer(prop.node)"
          @showInNewWindow="showInNewWindow(prop.node)"
          @rename="setRenameNode(prop.node)"
          @delete="deleteNode(prop.node)"
          @copyId="() => copyId(prop.node._id)"
          @copyAsLink="() => copyAsNoteLink(prop.node)"
        />
        <PaperMenu
          v-else-if="prop.node.dataType === 'paper'"
          @addNote="(noteType: NodeType) => addNode(prop.node._id.split('/')[0], 'note', noteType)"
          @showInExplorer="showInExplorer(prop.node)"
          @showInNewWindow="showInNewWindow(prop.node)"
          @delete="deleteNode(prop.node)"
          @copyId="() => copyId(prop.node._id)"
        />
        <FolderMenu
          v-else
          @showInExplorer="showInExplorer(prop.node)"
          @addNote="(noteType: NodeType) => addNode(prop.node._id, 'note', noteType)"
          @addFolder="addNode(prop.node._id, 'folder')"
          @renameFolder="setRenameNode(prop.node)"
          @deleteFolder="deleteNode(prop.node)"
        />

        <NodeTypeIcon :node="prop.node" :size="16" />
        <!-- note icon has 1rem width -->
        <!-- input must have keypress.space.stop since space is default to expand row rather than space in text -->
        <div v-if="prop.node._id == renamingNodeId">
          <q-input
            v-model="prop.node.label"
            @update:model-value="checkDuplicate(prop.node)"
            outlined
            dense
            :color="pathDuplicate ? 'red' : ''"
            @blur="renameNode"
            @keydown.enter="renameNode"
            @keypress.space.stop
            ref="renameInput"
          ></q-input>
          <q-tooltip
            v-if="pathDuplicate"
            v-model="pathDuplicate"
            class="bg-red"
          >
            {{ $t("duplicate") }}
          </q-tooltip>
        </div>
        <div
          v-else
          style="width: calc(100% - 1.4rem); font-size: 0.875rem"
          class="ellipsis non-selectable"
          :type="prop.node.dataType"
        >
          {{ prop.node.label.replace(/\.md$/, '') }}
          <q-tooltip> ID: {{ prop.key }} </q-tooltip>
        </div>
      </div>
    </template>
  </q-tree>
</template>
<script setup lang="ts">
import { QTree } from "quasar";
import {
  ProjectNode,
  Note,
  NodeType,
  Page,
  PageType,
  Project,
} from "src/backend/database";
import { getNotes } from "src/backend/note";
import { idToPath } from "src/backend/utils";
import { nameDialog } from "src/components/dialogs/dialogController";
import { useProjectActions } from "src/composables/useProjectActions";
import { useNodeActions } from "src/composables/useNodeActions";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { metadata } from "tauri-plugin-fs-extra-api";
import { computed, nextTick, onMounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import FolderMenu from "./FolderMenu.vue";
import NoteMenu from "./NoteMenu.vue";
import PaperMenu from "./PaperMenu.vue";
import ProjectMenu from "./ProjectMenu.vue";
import NodeTypeIcon from "src/components/shared/NodeTypeIcon.vue";

const { t } = useI18n({ useScope: "global" });

const layoutStore = useLayoutStore();
const projectStore = useProjectStore();

const {
  showExportCitationDialog,
  showInExplorer,
  showInNewWindow,
  copyId,
  copyAsProjectLink,
  copyAsNoteLink,
} = useProjectActions();
const {
  pathDuplicate,
  checkDuplicate: checkDuplicateAction,
  deleteNode: deleteNodeAction,
  renameNote: renameNoteAction,
  renameFolder: renameFolderAction,
} = useNodeActions();

const tree = ref<QTree | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);
const renamingNodeId = ref("");
const renamingNodeType = ref<"folder" | "note">("folder");
const oldNoteName = ref("");
const addingNode = ref(false);
const expanded = ref<string[]>([]);
const draggingNode = ref<Project | ProjectNode | null>(null);
const dragoverNode = ref<ProjectNode | null>(null);
const enterTime = ref(0);

onMounted(async () => {
  // expand all projects
  expanded.value = Array.from(projectStore.openedProjects.map((p) => p._id));
});

watchEffect(() => {
  showInTree(layoutStore.currentItemId);
});

const treeSelected = computed(() => {
  if (layoutStore.currentItemId === "graph") {
    return layoutStore.graphFocusItemId || "";
  }
  return layoutStore.currentItemId;
});

function selectItem(nodeId: string) {
  if (!tree.value) return;
  const node = tree.value.getNodeByKey(nodeId);

  // Projects and folders toggle expand/collapse — only children (notes) open
  if (node.dataType === "project" || node.dataType === "folder") {
    const idx = expanded.value.indexOf(node._id);
    if (idx > -1) expanded.value.splice(idx, 1);
    else expanded.value.push(node._id);
    return;
  }

  if (layoutStore.currentItemId === "graph") {
    layoutStore.graphFocusItemId = node._id;
    return;
  }

  // PDF nodes open the reader for that specific PDF
  layoutStore.openItem(node._id);
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
  // close all open pages (project reader + notes) then remove from sidebar
  layoutStore.closePage(projectId);
  const notes = await getNotes(projectId);
  for (const note of notes) {
    layoutStore.closePage(note._id);
  }
  projectStore.closeProject(projectId);
}

async function addNode(
  parentNodeId: string,
  nodeType: "folder" | "note",
  noteType: NodeType = NodeType.MARKDOWN
) {
  if (nodeType === "folder") {
    nameDialog.showWithOptions({
      title: t("new", { type: t("folder") }),
      placeholder: t("new", { type: t("folder") }),
      validate: (name: string) => {
        const tree_ref = tree.value;
        if (!tree_ref) return false;
        const parentNode = tree_ref.getNodeByKey(parentNodeId);
        if (!parentNode || !parentNode.children) return false;
        return parentNode.children.some(
          (child: ProjectNode) =>
            child.dataType === "folder" &&
            child.label.toLowerCase() === name.toLowerCase()
        );
      },
    });
    nameDialog.onConfirm(async () => {
      const node = await projectStore.createNode(parentNodeId, "folder");
      node.label = nameDialog.name;
      node._id = `${parentNodeId}/${nameDialog.name}`;
      await projectStore.addNode(node);
      expanded.value.push(parentNodeId);
    });
  } else {
    const node = await projectStore.createNode(parentNodeId, nodeType, noteType);
    await projectStore.addNode(node);
    expanded.value.push(parentNodeId);
    // Open the note immediately
    layoutStore.openItem(node._id);
    addingNode.value = true;
    await nextTick();
    setRenameNode(node);
  }
}

function setRenameNode(node: ProjectNode) {
  renamingNodeId.value = node._id;
  renamingNodeType.value = node.dataType;
  oldNoteName.value = (
    tree.value!.getNodeByKey(renamingNodeId.value) as Note
  ).label;
  pathDuplicate.value = false;

  setTimeout(() => {
    let input = renameInput.value;
    if (!input) return;
    input.focus();
    input.select();
  }, 100);
}

const renaming = ref(false);
async function renameNode() {
  if (renaming.value) return;
  renaming.value = true;

  const node = tree.value?.getNodeByKey(renamingNodeId.value) as ProjectNode;
  if (!node) {
    renaming.value = false;
    return;
  }

  const oldNodeId = renamingNodeId.value;

  if (renamingNodeType.value === "note") {
    await renameNoteAction(
      oldNodeId,
      node.label,
      (newNodeId, newLabel) => {
        node._id = newNodeId;
        node.label = newLabel;
        if (addingNode.value) selectItem(node._id);
        else if (layoutStore.currentItemId === oldNodeId) selectItem(newNodeId);
      },
      () => {
        node.label = oldNoteName.value;
      }
    );
  } else {
    await renameFolderAction(
      oldNodeId,
      node.label,
      (newFolderId, newLabel) => {
        node._id = newFolderId;
        node.label = newLabel;
      },
      () => {
        node.label = oldNoteName.value;
      }
    );
  }

  addingNode.value = false;
  renamingNodeId.value = "";
  oldNoteName.value = "";
  renaming.value = false;
}

async function checkDuplicate(node: Note) {
  if (!node) return;
  await checkDuplicateAction(node, node.label);
}

async function deleteNode(node: ProjectNode) {
  await deleteNodeAction(node, () => {
    if (node._id === projectStore.selected[0]?._id) {
      const projectId = node._id.split("/")[0];
      const project = projectStore.openedProjects.find(
        (p) => p._id === projectId
      );
      if (project && project.children) {
        if (project.children.length === 0) {
          selectItem(project._id);
        } else {
          selectItem(project.children[0]._id);
        }
      }
    }
  });
}

function onDragStart(e: DragEvent, node: Project | ProjectNode) {
  draggingNode.value = node;
  e.dataTransfer?.setData("draggingNode", JSON.stringify(node));

  let pageType: PageType | undefined;
  if (node.dataType === "note" && node._id.endsWith(".md"))
    pageType = PageType.NotePage;
  else if (node.dataType === "note" && node._id.endsWith(".excalidraw"))
    pageType = PageType.ExcalidrawPage;
  else if (node.dataType === "project") pageType = PageType.ReaderPage;
  if (pageType) {
    e.dataTransfer!.setData(
      "page",
      JSON.stringify({
        id: node._id,
        type: pageType,
        label: node.label,
        visible: true,
      })
    );
    e.dataTransfer!.setData("windowId", layoutStore.windowId);
  }
}

function onDragOver(e: DragEvent, node: ProjectNode) {
  if (draggingNode.value?.dataType === "project") return;
  e.preventDefault();
  dragoverNode.value = node;
  enterTime.value++;
  if (enterTime.value > 15) {
    if (node._id in expanded.value) return;
    expanded.value.push(node._id);
  }
}

function onDragLeave(e: DragEvent, node: ProjectNode) {
  enterTime.value = 0;
  dragoverNode.value = null;
}

async function onDrop(e: DragEvent, node: Project | ProjectNode) {
  if (draggingNode.value === null || draggingNode.value == node) return;

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
        label: note.label,
      } as Page);
    }
  } else {
    layoutStore.renamePage(dragId, {
      id: newId,
      label: label,
    } as Page);
  }
  await nextTick();
  await projectStore.renameNode(
    dragId,
    newId,
    isDragNodeDir ? "folder" : "note"
  );

  selectItem(newId);
  draggingNode.value = null;
  dragoverNode.value = null;
}
</script>
