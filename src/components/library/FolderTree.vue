<template>
  <!--
    div spans the entire background.
    q-tree only spans enough height to display its elements
  -->
  <div class="q-folder-tree">
    <q-tree
      dense
      no-connectors
      :duration="0"
      :nodes="folders"
      node-key="_id"
      v-model:expanded="expandedKeys"
      v-model:selected="projectStore.selectedCategory"
      :no-selection-unset="true"
      icon="mdi-chevron-right"
      selected-color="primary"
      ref="tree"
    >
      <template v-slot:default-header="prop">
        <div
          class="row full-width"
          :class="{
            dragover:
              !!dragoverNode &&
              dragoverNode == prop.node &&
              draggingNode != prop.node,
          }"
          draggable="true"
          @dragstart="(e: DragEvent) => onDragStart(e, prop.node)"
          @dragover="(e: DragEvent) => onDragOver(e, prop.node)"
          @dragleave="(e: DragEvent) => onDragLeave(e, prop.node)"
          @drop="((e: DragEvent) => onDrop(e, prop.node) as any)"
        >
          <q-menu
            touch-position
            context-menu
            class="menu"
          >
            <q-list dense>
              <q-item
                clickable
                v-close-popup
                @click="addCategoryNode(prop.node)"
              >
                <q-item-section>
                  <i18n-t keypath="add">
                    <template #type>{{ $t("folder") }}</template>
                  </i18n-t>
                </q-item-section>
              </q-item>
              <q-item
                v-if="!Object.values(SpecialCategory).includes(prop.node._id)"
                clickable
                v-close-popup
                @click="setRenameCategoryNode(prop.node)"
              >
                <q-item-section>{{ $t("rename") }}</q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                @click="exportCategory(prop.node)"
              >
                <q-item-section>{{ $t("export-references") }}</q-item-section>
              </q-item>
              <q-item
                v-if="!Object.values(SpecialCategory).includes(prop.node._id)"
                clickable
                v-close-popup
                @click="deleteCategoryNode(prop.node)"
              >
                <q-item-section>{{ $t("delete") }}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
          <!-- the body of a tree node -->
          <!-- icon width: 1.5rem -->
          <q-icon
            size="1.5rem"
            :name="
                Object.values(SpecialCategory).includes(prop.node._id)
                  ? prop.node.icon as string
                  : (
                    (prop.node._id === projectStore.selectedCategory || prop.expanded)
                    ? 'mdi-folder-open-outline'
                    : 'mdi-folder-outline'
                  )
            "
          />
          <!-- input must have keypress.space.stop since space is default to expand row rather than space in text -->
          <!-- v-model="prop.node.label" -->
          <input
            v-if="renamingCategory === prop.node._id"
            style="width: calc(100% - 1.5rem)"
            ref="renameInput"
            :text="getCategoryLabel(prop.node._id)"
            @blur="(e) => renameCategoryNode(prop.node._id, e.target!.value)"
            @keydown.enter="
              (e) => renameCategoryNode(prop.node._id, e.target!.value)
            "
            @keypress.space.stop
          />
          <div
            v-else
            style="font-size: 1rem; width: calc(100% - 1.5rem)"
            class="ellipsis"
          >
            {{
              Object.values(SpecialCategory).includes(prop.node._id)
                ? $t(prop.node.label)
                : prop.node.label
            }}
          </div>
        </div>
      </template>
    </q-tree>
  </div>
</template>

<script setup lang="ts">
// types

import { QTree, QTreeNode } from "quasar";
import { SpecialCategory, db } from "src/backend/database";
import { onMounted, ref } from "vue";
//db
import {
  getCategoryTree,
  getCategoryLabel,
  getParentCategory,
  updateCategory,
  deleteCategory,
  moveCategoryInto,
} from "src/backend/project/folder";
import { sortTree } from "src/backend/project/utils";
import { useProjectStore } from "src/stores/projectStore";
import { CategoryNode } from "src/backend/database";

const projectStore = useProjectStore();

const emit = defineEmits(["exportFolder"]);

const renameInput = ref<HTMLInputElement | null>(null);
const tree = ref<QTree | null>(null);

const folders = ref<CategoryNode[]>([]);
const expandedKeys = ref([SpecialCategory.LIBRARY.toString()]);
const renamingCategory = ref("");
const draggingNode = ref<CategoryNode | null>(null);
const dragoverNode = ref<CategoryNode | null>(null);
const enterTime = ref(0);

onMounted(async () => {
  folders.value = (await getCategoryTree()) as CategoryNode[];

  // add other special folders
  folders.value.push({
    _id: SpecialCategory.ADDED,
    // label: "added",
    // icon: "mdi-history",
    children: [],
  });
  folders.value.push({
    _id: SpecialCategory.FAVORITES,
    // label: "favorite",
    // icon: "mdi-star-outline",
    children: [],
  });
});

/**************************
 * Add, delete, update, export
 **************************/

/**
 * Adds a new folder as a child of the specified parent folder.
 * @param {CategoryNode} parentNode - The parent folder under which the new folder is added.
 * @param {string} [label] - Optional label for the new folder.
 * @param {boolean} [focus] - If true, sets the focus on the newly added folder.
 */
async function addCategoryNode(
  parentNode: CategoryNode,
  label?: string,
  focus?: boolean
) {
  const node = {
    _id: `${parentNode._id}/${db.nanoid}`,
    children: [],
  };

  // add to UI and expand the parent folder
  parentNode.children.push(node);
  expandedKeys.value.push(parentNode._id);

  // focus on it
  if (focus) projectStore.selectedCategory = node._id;

  // rename it if label is empty
  if (!!!label) setRenameCategoryNode(node);
}

/**
 * Deletes the specified folder from the tree and database.
 * @param {CategoryNode} node - The folder to be deleted.
 */
function deleteCategoryNode(node: CategoryNode) {
  if ((Object.values(SpecialCategory) as string[]).includes(node._id)) return;

  // remove from ui
  function _dfs(oldNode: CategoryNode): CategoryNode[] {
    var newNode = [] as CategoryNode[];
    for (let n of oldNode.children) {
      if (n._id !== node._id) {
        newNode.push({
          _id: n._id,
          children: _dfs(n),
        });
      }
    }
    return newNode;
  }
  folders.value[0].children = _dfs(folders.value[0]);

  // remove from db
  deleteCategory(node._id);

  // select another folder after this to refresh the table
  // if user is delete folder that are not currently selected, table won't refresh
  // but that's fine becase the database has been updated and the frontend is working as expected
  // it's just one line saying id=SFxxxx not found in console
  if (projectStore.selectedCategory === node._id)
    projectStore.selectedCategory = SpecialCategory.LIBRARY;
}

/**
 * Initiates the renaming process for a given folder.
 * @param {CategoryNode} node - The folder to be renamed.
 */
function setRenameCategoryNode(node: CategoryNode) {
  renamingCategory.value = node._id;

  setTimeout(() => {
    // wait till input appears
    // focus onto the input and select the text
    let input = renameInput.value;
    if (!input) return;
    input.focus();
    input.select();
  }, 100);
}

/**
 * Finalizes the renaming of a folder and updates it in the database.
 */
function renameCategoryNode(node: CategoryNode, newCategoryLabel: string) {
  if (!renamingCategory.value || !tree.value) return;
  // update db
  const components = node._id.split("/");
  components[components.length - 1] = newCategoryLabel;
  const newCategory = components.join("/");
  updateCategory(node._id, newCategory);

  // update ui
  node._id = newCategory;
  renamingCategory.value = "";

  // sort the tree
  sortTree(folders.value[0]);
}

/**
 * Triggers the export process for the specified folder's references.
 * @param {CategoryNode} node - The folder whose references are to be exported.
 */
function exportCategory(node: CategoryNode) {
  console.log(node);
  emit("exportFolder", node);
}

/****************
 * Drag and Drop
 ****************/

/**
 * On dragstart, set the dragging folder
 * @param e - dragevent
 * @param node - the folder user is dragging
 */
function onDragStart(e: DragEvent, node: CategoryNode) {
  draggingNode.value = node;
  // need to set transfer data for some browsers to work
  e.dataTransfer?.setData("draggingNode", JSON.stringify(node));
}

/**
 * When dragging node enters the folder, highlight and expand it.
 * @param e - dragevent
 * @param node - the folder user is dragging
 */
function onDragOver(e: DragEvent, node: CategoryNode) {
  // enable drop on the node
  e.preventDefault();

  // hightlight the dragover folder
  dragoverNode.value = node;

  // expand the node if this function is called over many times
  enterTime.value++;
  if (enterTime.value > 15) {
    if (node._id in expandedKeys.value) return;
    expandedKeys.value.push(node._id);
  }
}

/**
 * When the dragging node leaves the folders, reset the timer
 * @param e
 * @param node
 */
function onDragLeave(e: DragEvent, node: CategoryNode) {
  enterTime.value = 0;
  dragoverNode.value = null; // dehighlight the folder
}

/**
 * If draggedProjects is not empty, then we are dropping projects into folder
 * Otherwise we are dropping folder into another folder
 * @param e - dragevent
 * @param node - the folder / project user is dragging over
 */
async function onDrop(e: DragEvent, node: CategoryNode) {
  // record this first otherwise dragend events makes it null
  let _dragoverNode = dragoverNode.value as CategoryNode;
  let _draggingNode = draggingNode.value as CategoryNode;
  let draggedProjectsRaw = e.dataTransfer?.getData("draggedProjects");

  if (draggedProjectsRaw) {
    // drag and drop project into folder
    for (let project of JSON.parse(draggedProjectsRaw)) {
      if (!project.folderIds.includes(_dragoverNode._id)) {
        project.folderIds.push(_dragoverNode._id);
        await projectStore.updateProject(project._id, project);
      }
    }
  } else {
    // drag folder into another folder
    // update ui (do this first since parentfolder will change)
    // if no dragging folder or droping a folder "into" itself, exit
    if (_draggingNode === null || draggingNode.value == node) return;
    if (!tree.value) return;
    let dragParentFolder = (await getParentFolder(
      _draggingNode._id
    )) as CategoryNode;
    let dragParentNode = tree.value.getNodeByKey(
      dragParentFolder._id
    ) as CategoryNode;
    dragParentNode.children = dragParentNode.children.filter(
      (folder) =>
        (folder as CategoryNode)._id != (_draggingNode as CategoryNode)._id
    );
    node.children.push(_draggingNode);

    // update db
    await moveFolderInto(_draggingNode._id, node._id);
  }

  onDragEnd(e);
}

/**
 * Remove highlights
 * @param e - dragevent
 */
function onDragEnd(e: DragEvent) {
  draggingNode.value = null;
  dragoverNode.value = null;
}

function getLibraryNode() {
  if (!tree.value) return;
  return tree.value.getNodeByKey(SpecialFolder.LIBRARY.toString());
}

defineExpose({
  getLibraryNode,
  addFolder: addCategory,
  onDragEnd,
});
</script>
<style lang="scss" scoped>
.dragover {
  border: 1px solid aqua;
  background-color: rgba(0, 255, 255, 0.5);
}
</style>
