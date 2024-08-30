<template>
  <q-table
    id="projectList"
    class="stickyHeader no-shadow"
    dense
    hide-bottom
    square
    separator="none"
    table-header-style="white-space: nowarp"
    :rows-per-page-options="[0]"
    :columns="headers"
    :rows="computedRows"
    row-key="_id"
    :loading="loading"
    selection="multiple"
    v-model:selected="projectStore.selected"
    @selection="(details) => handleSelection(details.rows as Project[], details.added, details.evt as KeyboardEvent)
      "
    ref="table"
  >
    <template v-slot:header="props">
      <q-tr :props="props">
        <q-th
          auto-width
          style="padding: 0"
        >
          <input
            type="checkbox"
            v-model="props.selected"
            class="checkbox q-ml-md"
          />
        </q-th>
        <q-th auto-width></q-th>
        <q-th auto-width></q-th>
        <q-th
          v-for="col in (props.cols as Array<{ name: string, label: string }>)"
          :key="col.name"
          :props="props"
          style="padding: 0"
        >
          <span class="text-subtitle1 text-bold">{{ col.label }}</span>
        </q-th>
      </q-tr>
    </template>
    <template v-slot:body="props">
      <!-- ProjectRow -->
      <TableProjectRow
        :tableProps="props"
        no-hover
        style="cursor: pointer"
        class="tableview-row"
        :class="{
          'tableview-highlighted-row':
            projectStore.selected.map((item) => item._id).includes(props.key) &&
            !isClickingPDF,
        }"
        draggable="true"
        @dragstart="onDragStart"
        @dragend="onDragEnd"
        @expandRow="(isExpand: boolean) => props.expand = isExpand"
        @mousedown="(e: PointerEvent) => clickProject(props, e)"
        @mouseup="(e: PointerEvent) => clickProject(props, e)"
        @dblclick="dblclickProject(props.row)"
        @contextmenu="(e: PointerEvent) => toggleContextMenu(props, e)"
      />
      <!-- Expanded Rows -->

      <!-- PDF -->
      <TableItemRow
        v-if="props.expand && !!props.row.path"
        :item="props.row"
        :class="{
          'tableview-highlighted-row':
            projectStore.selected.map((item) => item._id).includes(props.key) &&
            isClickingPDF,
        }"
        @click="isClickingPDF = true"
      />
      <!-- Notes -->
      <TableItemRow
        v-show="props.expand"
        v-for="note in (props.row.children as Note[])"
        :key="note._id"
        :item="note"
        :class="{
          'tableview-highlighted-row': projectStore.selected
            .map((item) => item._id)
            .includes(note._id),
        }"
      />

      <!-- Matching Rows  -->
      <TableSearchRow
        v-show="!!searchString"
        :class="{
          'tableview-highlighted-row': projectStore.selected
            .map((item) => item._id)
            .includes(props.key),
        }"
        :width="searchRowWidth"
        :text="expansionText[props.rowIndex]"
      />
    </template>
  </q-table>
</template>

<script setup lang="ts">
// types
import { QTable, QTableColumn, QTr } from "quasar";
import { Note, Project, sqldb } from "src/backend/database";
import {
  PropType,
  computed,
  nextTick,
  onMounted,
  provide,
  ref,
  toRaw,
  watch,
} from "vue";
// components
import TableItemRow from "./TableItemRow.vue";
import TableProjectRow from "./TableProjectRow.vue";
import TableSearchRow from "./TableSearchRow.vue";
// db
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();
// utils
import { useI18n } from "vue-i18n";
const { t } = useI18n({ useScope: "global" });

const props = defineProps({
  searchString: { type: String, required: true },
  projects: { type: Array as PropType<Project[]>, required: true },
});

const emit = defineEmits(["dragProject", "update:projects"]);
let storedSelectedRow = {};
const renamingNoteId = ref("");
provide("renamingNoteId", renamingNoteId);
const isClickingPDF = ref(false);
const expansionText = ref<string[]>([]);
const loading = ref(false); // is table filtering data
const table = ref();
const searchRowWidth = ref(0);
const headers = computed(() => {
  return [
    {
      name: "title",
      field: "title",
      label: t("title"),
      align: "left",
      sortable: true,
    },
    {
      name: "author",
      field: "author",
      label: t("author"),
      align: "left",
      sortable: true,
    },
  ] as QTableColumn[];
});

const computedRows = ref(props.projects);
watch(
  () => props.projects,
  () => {
    computedRows.value = props.projects;
  }
);
watch(() => props.searchString, filterRows);

onMounted(() => {
  searchRowWidth.value = table.value.$el.getBoundingClientRect().width * 0.8;
});

/**
 * Handle the selection of rows in the table.
 * @param {Project[]} rows - The selected rows (projects).
 * @param {boolean} added - Indicates if rows were added to the selection.
 * @param {KeyboardEvent} evt - The keyboard event associated with the selection.
 */
function handleSelection(rows: Project[], added: boolean, evt: KeyboardEvent) {
  // ignore selection change from header of not from a direct click event
  if (rows.length !== 1 || evt === void 0) {
    return;
  }

  const oldSelectedRow = storedSelectedRow;
  const [newSelectedRow] = rows;
  const { ctrlKey, shiftKey } = evt;

  if (shiftKey !== true) {
    storedSelectedRow = newSelectedRow;
  }

  // wait for the default selection to be performed
  nextTick(() => {
    if (shiftKey === true) {
      const tableRows = table.value.filteredSortedRows;
      let firstIndex = tableRows.indexOf(oldSelectedRow);
      let lastIndex = tableRows.indexOf(newSelectedRow);

      if (firstIndex < 0) {
        firstIndex = 0;
      }

      if (firstIndex > lastIndex) {
        [firstIndex, lastIndex] = [lastIndex, firstIndex];
      }

      const rangeRows = tableRows.slice(firstIndex, lastIndex + 1);
      // we need the original row object so we can match them against the rows in range
      const selectedRows = projectStore.selected.map(toRaw);

      projectStore.selected =
        added === true
          ? selectedRows.concat(
              rangeRows.filter(
                (row: Project) => selectedRows.includes(row) === false
              )
            )
          : selectedRows.filter((row) => rangeRows.includes(row) === false);
    } else if (ctrlKey !== true && added === true) {
      projectStore.selected = [newSelectedRow];
    }
  });
}

/**
 * Handle a click event on a project row.
 * @param {Object} props - The properties of the clicked row.
 * @param {PointerEvent} e - The mouse event associated with the click.
 */
function clickProject(
  props: {
    row: Project;
    rowIndex: number;
    selected: boolean;
  },
  e: PointerEvent
) {
  if (e.button !== 0) return; // return if not left click
  if (e.type === "mousedown" && props.selected) return; // return if clicking on a selected project
  if (
    e.type === "mouseup" &&
    (e.target as HTMLInputElement)?.type === "checkbox"
  )
    return; // return if clicking on the checkbox, the checkbox will take care of selection for us

  // row: Project, rowIndex: number
  let row = props.row;
  let descriptor = Object.getOwnPropertyDescriptor(props, "selected");
  if (descriptor)
    (descriptor.set as (adding: boolean, e: Event) => void)(true, e);

  console.log(row);
  // ditinguish clicking project row or pdf row
  isClickingPDF.value = false;
}

/**
 * Handle a double-click event on a project row.
 * @param {Project} row - The project row that was double-clicked.
 */
function dblclickProject(row: Project) {
  layoutStore.openItem(row._id);
}

/**
 * Toggle the context menu on right-clicking a project row.
 * @param {Object} props - The properties of the clicked row.
 * @param {PointerEvent} e - The mouse event associated with the right-click.
 */
function toggleContextMenu(
  props: { selected: boolean; row: Project },
  e: PointerEvent
) {
  // change nothing when right clicked on selected item
  if (props.selected) return;

  // only change the selected items when user right click on a not selected item
  if (
    !projectStore.selected.map((project) => project._id).includes(props.row._id)
  )
    projectStore.selected = [props.row];
}

/**
 * Drag event starts and set draggingProject
 * @param projectId
 */
function onDragStart(e: DragEvent) {
  let rows = document.querySelectorAll("tr.tableview-highlighted-row");
  let div = document.createElement("div");
  div.id = "drag-group";
  div.style.position = "absolute";
  div.style.top = "-1000px"; // make this invisible
  document.body.append(div);
  for (let row of rows) {
    let clone = row.cloneNode(true) as HTMLElement;
    clone.classList.add("bg-primary");
    div.append(clone);
  }
  e.dataTransfer?.setDragImage(div, 0, 0);
  e.dataTransfer?.setData(
    "draggedProjects",
    JSON.stringify(projectStore.selected)
  );
}

/**
 * Drag event ends and set draggingProjectId to ""
 */
function onDragEnd() {
  document.getElementById("drag-group")?.remove();
}

/**
 * filter rows in table using full text search
 */
async function filterRows() {
  if (!props.searchString) {
    computedRows.value = props.projects;
    return;
  }
  computedRows.value = [];
  expansionText.value = [];
  const results = (await sqldb.queryData(props.searchString)) as Array<{
    id: string;
    pages: string;
    extracts: string;
  }>;
  for (let result of results) {
    let [projectId, noteName] = result.id.split("/");
    let row = props.projects.find((row) => row._id == projectId);
    if (!row) continue;
    computedRows.value.push(row);

    // expansion text
    let text = "";
    let matches = result.extracts.split("</br>");
    let pages = result.pages.split(",");
    for (let [ind, match] of matches.entries()) {
      let highlightedRow = match
        .trim()
        .replaceAll(
          "highlight-class-place-holder",
          "tableview-highlighted-row"
        );
      let indicator = noteName
        ? `<b>${noteName}:</b>`
        : `<b>PDF Page${pages[ind]}:</b>`;
      text += `<div>${indicator} ${highlightedRow}</div>`;
    }
    expansionText.value.push(text);
  }
}
</script>
