<template>
  <q-tr>
    <ExportDialog
      v-model:show="exportCitationDialog"
      @confirm="(format, options) => exportCitation(format, options)"
    />
    <q-th auto-width>
      <input
        type="checkbox"
        class="q-mt-xs"
        style="width: 0.9rem; height: 0.9rem"
        v-model="tableProps.selected"
        @mousedown.stop
      />
    </q-th>
    <q-th auto-width>
      <q-checkbox
        dense
        size="sm"
        color="yellow"
        checked-icon="mdi-star"
        unchecked-icon="mdi-star-outline"
        :model-value="!!tableProps.row.favorite"
        @update:model-value="(isFavorite: boolean) => menu?.setFavorite(isFavorite)"
        @mousedown.stop
      />
    </q-th>
    <q-td auto-width>
      <q-icon
        v-if="!!tableProps.row.path || (tableProps.row.children?.length as typeof NaN) > 0"
        size="sm"
        :name="tableProps.expand ? 'mdi-menu-down' : 'mdi-menu-right'"
        @click="expandRow(!tableProps.expand)"
      />
    </q-td>
    <q-td
      v-for="col in tableProps.cols"
      :key="col.name"
      :props="tableProps"
    >
      <div
        v-if="col.name === 'author'"
        style="font-size: 1rem"
        class="ellipsis"
      >
        {{ shortAuthorString(col.value as Author[]) }}
      </div>
      <div
        v-else
        style="font-size: 1rem; min-width: 20vw; max-width: 50vw"
        class="ellipsis"
      >
        {{ col.value }}
      </div>
    </q-td>

    <TableProjectMenu
      :projectId="tableProps.key"
      @expandRow="expandRow"
      @exportCitation="showExportCitationDialog"
      ref="menu"
    />
  </q-tr>
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar";
import { Author, Project } from "src/backend/database";
import { getMeta } from "src/backend/project/meta";
import { PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import ExportDialog from "./ExportDialog.vue";
import TableProjectMenu from "./TableProjectMenu.vue";
const { t } = useI18n({ useScope: "global" });

const menu = ref<InstanceType<typeof TableProjectMenu>>();
const exportCitationDialog = ref(false);
const project = ref<Project | null>(null);
const $q = useQuasar();

const props = defineProps({
  tableProps: {
    type: Object as PropType<{
      key: string;
      row: Project;
      cols: { name: string; value: string | Author[] }[];
      rowIndex: number;
      expand: boolean;
      selected: boolean;
    }>,
    required: true
  }
});
const emit = defineEmits(["expandRow", "setFavorite"]);

/**
 * Handles the expansion of a row in the table.
 * @param {boolean} isExpand - Indicates whether to expand or collapse the row.
 */
function expandRow(isExpand: boolean) {
  emit("expandRow", isExpand);
}

/**
 * Opens the export citation dialog for the given project.
 * @param {Project} _project - The project to export the citation for.
 */
function showExportCitationDialog(_project: Project) {
  exportCitationDialog.value = true;
  project.value = _project;
}

/**
 * Exports the citation for the current project in the specified format with optional options.
 * @param {string} format - The citation format (citation.js supported format).
 * @param {object} options - Optional extra options for the export.
 */
async function exportCitation(
  format: string,
  options: { format?: string; template?: string }
) {
  if (project.value) {
    // const metas = await exportMeta(format, options, undefined, project.value);
    const meta = await getMeta([project.value], format, options);
    await copyToClipboard(meta as string);
    $q.notify(t("text-copied"));
  }
}

/**
 * Generates a short author string based on the provided list of authors.
 * @param {Author[]} authors - The list of authors to generate the string from.
 * @returns {string} - The short author string.
 */
function shortAuthorString(authors: Author[]) {
  if (authors === undefined) return;

  if (authors.length === 0) return "";
  else if (authors.length === 1) {
    let author = authors[0];
    if (author.literal) return author.literal;
    else return author.family;
  } else if (authors.length === 2) {
    let surnames = [];
    for (let i = 0; i < 2; i++) {
      if (authors[0].literal) surnames.push(authors[0].literal);
      else surnames.push(authors[0].family);
    }
    return surnames.join(" and ");
  } else {
    let author = authors[0];
    if (author.literal) return author.literal;
    else return `${author.family} et al.`;
  }
}
</script>
