<template>
  <q-tree
    ref="tree"
    dense
    no-transition
    no-selection-unset
    :no-nodes-label="$t('no-working-projects')"
    :nodes="projectStore.openedProjects"
    node-key="_id"
    selected-color="primary"
    v-model:selected="stateStore.currentItemId"
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
            draggingNode != prop.node,
        }"
        @click="selectItem(prop.node)"
        :draggable="prop.node.dataType !== 'project'"
        @dragstart="(e) => onDragStart(e, prop.node)"
        @dragover="(e) => onDragOver(e, prop.node)"
        @dragleave="(e) => onDragLeave(e, prop.node)"
        @drop="(e) => onDrop(e, prop.node)"
      >
        <q-menu
          square
          touch-position
          context-menu
          @before-show="menuSwitch(prop.node)"
        >
          <!-- menu for project -->
          <q-list
            dense
            v-if="showProjectMenu"
          >
            <q-item
              clickable
              v-close-popup
              @click="addNote(prop.node, NoteType.MARKDOWN)"
            >
              <q-item-section>
                {{ $t("add-markdown-note") }}
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="addNote(prop.node, NoteType.EXCALIDRAW)"
            >
              <q-item-section>
                {{ $t("add-excalidraw") }}
              </q-item-section>
            </q-item>
            <q-separator />
            <q-item
              clickable
              v-close-popup
              @click="showInExplorer(prop.node)"
            >
              <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="closeProject(prop.key)"
            >
              <q-item-section>
                {{ $t("close-project") }}
              </q-item-section>
            </q-item>
          </q-list>

          <!-- menu for notes -->
          <q-list
            dense
            v-else
          >
            <q-item
              clickable
              v-close-popup
              @click="showInExplorer(prop.node)"
            >
              <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="setRenameNote(prop.node._id)"
              :disable="prop.node.label === prop.node.projectId + '.md'"
            >
              <q-item-section> {{ $t("rename") }} </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              @click="deleteNote(prop.node)"
              :disable="prop.node.label === prop.node.projectId + '.md'"
            >
              <q-item-section> {{ $t("delete") }} </q-item-section>
            </q-item>
          </q-list>
        </q-menu>

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
        <div v-if="prop.node._id == renamingNoteId">
          <input
            style="width: calc(100% - 1.4rem)"
            v-model="prop.node.label"
            @input="checkDuplicate(prop.node)"
            @keydown.enter="renameNote"
            @blur="renameNote"
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
        <q-tooltip> {{ $t("close-project") }} </q-tooltip>
      </q-icon>
    </template>
  </q-tree>
</template>
<script setup lang="ts">
import { inject, nextTick, onMounted, ref, watch } from "vue";
import { QTree } from "quasar";
import {
  FolderOrNote,
  Note,
  NoteType,
  Page,
  Project,
  db,
} from "src/backend/database";
// db
import { useStateStore } from "src/stores/appState";
import { useProjectStore } from "src/stores/projectStore";
import { getProject } from "src/backend/project/project";
import { dirname, join } from "@tauri-apps/api/path";
import { exists, renameFile } from "@tauri-apps/api/fs";
import { invoke } from "@tauri-apps/api";
import { metadata } from "tauri-plugin-fs-extra-api";
import { pathToId } from "src/backend/project/utils";

const stateStore = useStateStore();
const projectStore = useProjectStore();

const tree = ref<QTree | null>(null);
const renameInput = ref<HTMLInputElement | null>(null);
const renamingNoteId = ref("");
const oldNoteName = ref("");
const pathDuplicate = ref(false);
const addingNote = ref(false);
const expanded = ref<string[]>([]);
const showProjectMenu = ref(true);
const draggingNode = ref<FolderOrNote | null>(null);
const dragoverNode = ref<FolderOrNote | null>(null);
const enterTime = ref(0);

const updateComponent = inject("updateComponent") as (
  oldItemId: string,
  state: { id: string; label: string }
) => Promise<void>;

onMounted(async () => {
  // expand all projects
  expanded.value = Array.from(projectStore.openedProjects.map((p) => p._id));

  // select the item associated with current window
  let selected = stateStore.currentItemId;
  if (!tree.value) return;
  let selectedNode = tree.value.getNodeByKey(selected);
  if (!!selectedNode && selectedNode?.children?.length > 0)
    expanded.value.push(selected);
});

watch(
  () => stateStore.openedPage,
  async (page: Page) => {
    if (page.type.indexOf("Plugin") > -1) return;
    if (!!!page.id || !tree.value) return;
    let node = tree.value.getNodeByKey(page.id);
    if (!!node) return; // if project is active already, return

    let item = (await getProject(page.id)) as Project | Note;
    if (item?.dataType == "project") {
      await projectStore.openProject(page.id);
      expanded.value.push(page.id);
    } else if (item?.dataType == "note") {
      // some notes are independent of project, like memo
      if (!item.projectId) return;
      await projectStore.openProject(item.projectId);
    }
  },
  { deep: true }
);

function menuSwitch(node: Project | Note) {
  if (node.dataType == "note") {
    // show context menu for notes
    showProjectMenu.value = false;
  } else {
    // show context menu for project
    showProjectMenu.value = true;
  }
}

function selectItem(node: Project | FolderOrNote) {
  console.log("node", node);
  stateStore.currentItemId = node._id;
  if ((node.children?.length as number) > 0) expanded.value.push(node._id);
  if (node.dataType === "folder") return;

  // open item
  let id = node._id;
  let label = node.label;
  let type = "";
  if (node.dataType === "project") type = "ReaderPage";
  else if (node.dataType === "note")
    type = node.type === NoteType.EXCALIDRAW ? "ExcalidrawPage" : "NotePage";

  stateStore.openPage({ id, type, label });
}

async function showInExplorer(node: Project | Note) {
  const path = node.path || (await join(db.storagePath, node._id));
  await invoke("show_in_folder", {
    path: path,
  });
}

async function closeProject(projectId: string) {
  // close all pages
  let project = projectStore.openedProjects.find((p) => p._id === projectId);
  if (project) {
    stateStore.closePage(project._id);
    for (let note of project.children as Note[]) {
      await nextTick(); // do it slowly one by one
      stateStore.closePage(note._id);
    }
  }

  // remove project from openedProjects
  projectStore.openedProjects = projectStore.openedProjects.filter(
    (p) => p._id !== projectId
  );

  // if no page left, open library page
  setTimeout(() => {
    if (projectStore.openedProjects.length === 0)
      stateStore.currentItemId = "library";
  }, 50);
}

async function addNote(node: Project | FolderOrNote, type: NoteType) {
  const note = await projectStore.createNote(node._id, type);
  await projectStore.addNote(note);
  expanded.value.push(node._id);
  addingNote.value = true;
  // rename note
  await nextTick(); // wait until ui updates
  setRenameNote(note._id);
}

async function deleteNote(note: Note) {
  stateStore.closePage(note._id);
  await projectStore.deleteNote(note._id);
  // select something else if the selectedItem is deleted
  if (note._id === projectStore.selected[0]?._id) {
    let project = projectStore.openedProjects.find(
      (p) => p._id === note.projectId
    );

    if (project && project.children) {
      if (project.children.length == 0) {
        selectItem(project);
      } else {
        selectItem(project.children[0]);
      }
    }
  }
}

function setRenameNote(noteId: string) {
  console.log("noteId", noteId);
  // set renaming note and show input
  renamingNoteId.value = noteId;
  oldNoteName.value = (
    tree.value!.getNodeByKey(renamingNoteId.value) as Note
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

async function renameNote() {
  const note = tree.value?.getNodeByKey(renamingNoteId.value) as Note;
  if (!!!note) return;

  if (pathDuplicate.value) {
    note.label = oldNoteName.value;
  } else {
    let newNote = await projectStore.updateNote(note._id, note);

    // update window tab name
    updateComponent(renamingNoteId.value, {
      id: newNote._id,
      label: newNote.label,
    });
  }

  if (addingNote.value) selectItem(note); // open the note
  addingNote.value = false;
  renamingNoteId.value = "";
  oldNoteName.value = "";
}

async function checkDuplicate(note: Note) {
  if (!note) return;
  const extension = note.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  const path = await join(await dirname(note.path), note.label + extension);

  if ((await exists(path)) && path !== note.path) pathDuplicate.value = true;
  else pathDuplicate.value = false;
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
  const oldPath = draggingNode.value.path;
  const label = draggingNode.value.label;
  let newPath = "";
  if (node.dataType === "project") {
    newPath = await join(db.storagePath, node._id, label);
  } else {
    const meta = await metadata((node as FolderOrNote).path);
    if (!meta.isDir) return;
    newPath = await join((node as FolderOrNote).path, label);
  }
  await renameFile(oldPath, newPath);

  // update ui
  if (!tree.value) return;
  const dirId = await dirname(dragId);
  let dragParentNode = tree.value.getNodeByKey(dirId) as FolderOrNote;
  dragParentNode.children = dragParentNode.children!.filter(
    (child) => (child as FolderOrNote)._id != dragId
  );
  if (!node.children) node.children = [];

  draggingNode.value.path = newPath;
  draggingNode.value._id = pathToId(newPath);
  node.children.push(draggingNode.value);

  projectStore.renamedNote = draggingNode;
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
