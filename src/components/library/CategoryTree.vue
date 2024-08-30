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
          <div
            v-if="renamingCategory === prop.node._id"
            style="width: calc(100% - 1.5rem)"
          >
            <!-- input must have keypress.space.stop since space is default to expand row rather than space in text -->
            <input
              ref="renameInput"
              v-model="newCategoryLabel"
              :style="pathDuplicate ? 'border-color: red' : ''"
              @focus="newCategoryLabel = getCategoryLabel(prop.node._id)"
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
                : getCategoryLabel(prop.node._id)
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
import { onMounted, ref } from "vue";
//db
import {
  getCategoryTree,
  getCategoryLabel,
  getParentCategory,
  updateCategory,
  deleteCategory,
  moveCategoryInto,
} from "src/backend/category";
import { sortTree } from "src/backend/utils";
import { useProjectStore } from "src/stores/projectStore";
import { CategoryNode } from "src/backend/database";

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
  categoryNodes.value = (await getCategoryTree()) as CategoryNode[];
  categoryNodes.value[0].icon = "mdi-library-outline";

  // add other special categories
  categoryNodes.value.push({
    _id: SpecialCategory.ADDED,
    icon: "mdi-history",
    children: [],
  });
  categoryNodes.value.push({
    _id: SpecialCategory.FAVORITES,
    icon: "mdi-star-outline",
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
  const node = {
    _id: `${parentNode._id}/${label || db.nanoid}`,
    children: [],
  };

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
  deleteCategory(node._id);

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
 * @param {string} label - Input label
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
    const components = node._id.split("/");
    components[components.length - 1] = newCategoryLabel.value;
    const newCategory = components.join("/");
    updateCategory(node._id, newCategory);

    // update ui
    node._id = newCategory;
  }

  // update ui
  renamingCategory.value = "";
  sortTree(categoryNodes.value[0]);
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
  let _dragoverNode = dragoverNode.value as CategoryNode;
  let _draggingNode = draggingNode.value as CategoryNode;
  let draggedProjectsRaw = e.dataTransfer?.getData("draggedProjects");

  if (draggedProjectsRaw) {
    // drag and drop project into category
    for (let project of JSON.parse(draggedProjectsRaw) as Project[]) {
      if (!project.categories.includes(_dragoverNode._id)) {
        project.categories.push(_dragoverNode._id);
        await projectStore.updateProject(project._id, project);
      }
    }
  } else {
    // drag category into another category
    // update ui (do this first since parentcategory will change)
    // if no dragging category or droping a category "into" itself, exit
    if (_draggingNode === null || draggingNode.value == node) return;
    if (!tree.value) return;
    let dragParentNode = tree.value.getNodeByKey(
      getParentCategory(_draggingNode._id)
    ) as CategoryNode;
    dragParentNode.children = dragParentNode.children.filter(
      (node) =>
        (node as CategoryNode)._id != (_draggingNode as CategoryNode)._id
    );
    node.children.push(_draggingNode);

    // update db
    await moveCategoryInto(_draggingNode._id, node._id);
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
