<template>
  <!--
    div spans the entire background.
    q-tree only spans enough height to display its elements
  -->
  <div class="q-category-tree">
    <q-tree
      dense
      no-connectors
      :duration="0"
      :nodes="categoryNodes as QTreeNode[]"
      node-key="_id"
      v-model:expanded="expandedKeys"
      v-model:selected="projectStore.selectedCategory"
      :no-selection-unset="true"
      icon="keyboard_arrow_right"
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
          @click="onClick(prop.node)"
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
                    <template #type>{{ $t("category") }}</template>
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
          <component
            :is="getNodeIcon(prop.node, prop.expanded)"
            width="18"
            height="18"
            class="q-mr-xs"
          />
          <div
            v-if="renamingCategory === prop.node._id"
            style="width: calc(100% - 1.5rem)"
          >
            <!-- input must have keypress.space.stop since space is default to expand row rather than space in text -->
            <input
              ref="renameInput"
              v-model="newCategoryLabel"
              :style="pathDuplicate ? 'border-color: red' : ''"
              @focus="newCategoryLabel = getIdLabel(prop.node._id)"
              @input="checkDuplicate(prop.node)"
              @blur="renameCategoryNode(prop.node)"
              @keydown.enter="renameCategoryNode(prop.node)"
              @keypress.space.stop
            />
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
            style="font-size: 1rem; width: calc(100% - 1.5rem)"
            class="ellipsis"
          >
            {{
              Object.values(SpecialCategory).includes(prop.node._id)
                ? $t(prop.node._id)
                : getIdLabel(prop.node._id)
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
import { Project, SpecialCategory, db } from "src/backend/database";
import { onMounted, ref, type Component } from "vue";
import { sortTree, getIdLabel, traverseTree } from "src/backend/utils";
import { useProjectStore } from "src/stores/projectStore";
import { CategoryNode } from "src/backend/database";
import { useI18n } from "vue-i18n";
import { BookStack, ClockRotateRight, Star, Folder } from "@iconoir/vue";

const { t } = useI18n({ useScope: "global" });

const specialCategoryIcons: Record<string, Component> = {
  [SpecialCategory.LIBRARY]: BookStack,
  [SpecialCategory.ADDED]: ClockRotateRight,
  [SpecialCategory.FAVORITES]: Star,
};

function getNodeIcon(node: CategoryNode, expanded: boolean): Component {
  if (Object.values(SpecialCategory).includes(node._id as SpecialCategory)) {
    return specialCategoryIcons[node._id] || Folder;
  }
  return Folder;
}

const projectStore = useProjectStore();

const emit = defineEmits(["exportCategory"]);

const renameInput = ref<HTMLInputElement | null>(null);
const tree = ref<QTree | null>(null);

const categoryNodes = ref<CategoryNode[]>([]);
const expandedKeys = ref([SpecialCategory.LIBRARY.toString()]);
const renamingCategory = ref("");
const pathDuplicate = ref(false);
const newCategoryLabel = ref("");
const draggingNode = ref<CategoryNode | null>(null);
const dragoverNode = ref<CategoryNode | null>(null);
const enterTime = ref(0);

onMounted(async () => {
  categoryNodes.value =
    (await projectStore.getCategoryTree()) as CategoryNode[];

  // add other special categories
  categoryNodes.value.push({
    _id: SpecialCategory.ADDED,
    children: [],
  });
  categoryNodes.value.push({
    _id: SpecialCategory.FAVORITES,
    children: [],
  });
});

/**************************
 * Add, delete, update, export
 **************************/

/**
 * Adds a new category as a child of the specified parent category.
 * @param {CategoryNode} parentNode - The parent category under which the new category is added.
 * @param {string} [label] - Optional label for the new category.
 * @param {boolean} [focus] - If true, sets the focus on the newly added category.
 */
async function addCategoryNode(
  parentNode: CategoryNode,
  label?: string,
  focus?: boolean
) {
  if (!tree.value) return;

  let node = { _id: "", children: [] };
  if (label) {
    node._id = `${parentNode._id}/${label || db.nanoid}`;
  } else {
    node._id = `${parentNode._id}/${t("new", { type: t("category") })}`;
    let i = 1;
    while (tree.value.getNodeByKey(node._id)) {
      node._id = `${parentNode._id}/${t("new", { type: t("category") })} ${i}`;
      i++;
    }
  }

  // add to UI and expand the parent category
  parentNode.children.push(node);
  expandedKeys.value.push(parentNode._id);

  // focus on it
  if (focus) projectStore.selectedCategory = node._id;

  // rename it if label is empty
  if (!!!label) setRenameCategoryNode(node);
}

/**
 * Deletes the specified category from the tree and database.
 * @param {CategoryNode} node - The category to be deleted.
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
  categoryNodes.value[0].children = _dfs(categoryNodes.value[0]);

  // remove from db
  projectStore.deleteCategory(node._id);

  // select another category after this to refresh the table
  // if user is delete category that are not currently selected, table won't refresh
  // but that's fine becase the database has been updated and the frontend is working as expected
  // it's just one line saying id=SFxxxx not found in console
  if (projectStore.selectedCategory === node._id)
    projectStore.selectedCategory = SpecialCategory.LIBRARY;
}

/**
 * Initiates the renaming process for a given category.
 * @param {CategoryNode} node - The category to be renamed.
 */
function setRenameCategoryNode(node: CategoryNode) {
  renamingCategory.value = node._id;
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

/**
 * Checks for duplicate paths when renaming a node.
 * @param {CategoryNode} node - The note being renamed to check for duplicates.
 */
function checkDuplicate(node: CategoryNode) {
  if (!node || !tree.value) return;

  const components = node._id.split("/");
  components[components.length - 1] = newCategoryLabel.value;
  const newCategory = components.join("/");
  pathDuplicate.value = !!tree.value.getNodeByKey(newCategory);
}

/**
 * Finalizes the renaming of a category and updates it in the database.
 */
function renameCategoryNode(node: CategoryNode) {
  if (!renamingCategory.value || !tree.value) return;
  if (!pathDuplicate.value && newCategoryLabel.value) {
    // update db
    const oldCategory = node._id;
    const components = oldCategory.split("/");
    components[components.length - 1] = newCategoryLabel.value;
    const newCategory = components.join("/");
    projectStore.updateCategory(oldCategory, newCategory);

    // update ui, update _id of current and sub categories
    traverseTree(
      node as QTreeNode,
      (n) => (n._id = n._id.replace(oldCategory, newCategory))
    );
  }

  // update ui
  renamingCategory.value = "";
  sortTree(categoryNodes.value[0] as QTreeNode);
}

/**
 * Triggers the export process for the specified category's references.
 * @param {CategoryNode} node - The category whose references are to be exported.
 */
function exportCategory(node: CategoryNode) {
  console.log(node);
  emit("exportCategory", node);
}

/****************
 * Drag and Drop
 ****************/

/**
 * On dragstart, set the dragging category
 * @param e - dragevent
 * @param node - the category user is dragging
 */
function onDragStart(e: DragEvent, node: CategoryNode) {
  console.log("on drag start", node);
  draggingNode.value = node;
  // need to set transfer data for some browsers to work
  e.dataTransfer?.setData("draggingNode", JSON.stringify(node));
}

/**
 * When dragging node enters the category, highlight and expand it.
 * @param e - dragevent
 * @param node - the category user is dragging
 */
function onDragOver(e: DragEvent, node: CategoryNode) {
  // enable drop on the node
  e.preventDefault();

  // hightlight the dragover category
  dragoverNode.value = node;

  // expand the node if this function is called over many times
  enterTime.value++;
  if (enterTime.value > 15) {
    if (node._id in expandedKeys.value) return;
    expandedKeys.value.push(node._id);
  }
}

/**
 * When the dragging node leaves the category, reset the timer
 * @param e
 * @param node
 */
function onDragLeave(e: DragEvent, node: CategoryNode) {
  enterTime.value = 0;
  dragoverNode.value = null; // dehighlight the category
}

/**
 * If draggedProjects is not empty, then we are dropping projects into category
 * Otherwise we are dropping category into another category
 * @param e - dragevent
 * @param node - the category / project user is dragging over
 */
async function onDrop(e: DragEvent, node: CategoryNode) {
  // record this first otherwise dragend events makes it null
  const draggedProjectsRaw = e.dataTransfer?.getData("draggedProjects");
  const dropId = node._id;

  if (draggedProjectsRaw) {
    // drag and drop project into category
    for (let project of JSON.parse(draggedProjectsRaw) as Project[]) {
      console.log("droping", project, "into", dropId);
      if (!project.categories.includes(dropId)) {
        project.categories.push(dropId);
        await projectStore.updateProject(project._id, project);
      }
    }
  } else if (draggingNode.value) {
    const dragId = draggingNode.value._id;
    // no dropping into itself
    if (dragId === dropId) return;
    // drag category into another category
    // check duplicate
    let newId = `${dropId}/${getIdLabel(dragId)}`;
    let i = 1;
    while (tree.value!.getNodeByKey(newId)) {
      newId = `${dropId}/${getIdLabel(dragId)} ${i}`;
      i++;
    }

    // move ui nodes
    function moveNodes(root: CategoryNode) {
      if (root._id === dropId) {
        root.children.push({
          _id: newId,
          children: draggingNode.value!.children,
        });
      }
      root.children = root.children.filter((n) => n._id !== dragId);
      if (root._id.startsWith(dragId!)) root._id.replace(dragId!, newId);
      for (let child of root.children) moveNodes(child);
    }
    moveNodes(categoryNodes.value[0]);

    // update db
    await projectStore.updateCategory(dragId, newId);
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
  return tree.value.getNodeByKey(SpecialCategory.LIBRARY.toString());
}

function onClick(node) {
  console.log(node);
}

defineExpose({
  getLibraryNode,
  addCategoryNode,
});
</script>
<style lang="scss" scoped>
.dragover {
  border: 1px solid aqua;
  background-color: rgba(0, 255, 255, 0.5);
}
</style>
