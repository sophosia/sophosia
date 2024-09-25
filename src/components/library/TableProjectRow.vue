<template>
  <q-tr class="table">
    <q-th auto-width>
      <!-- cannot use q-checkbox here since it doesn't work with selection -->
      <input
        type="checkbox"
        class="checkbox"
        v-model="tableProps.selected"
        @mousedown.stop
      />
      <!-- <q-checkbox v-model="tableProps.selected"> </q-checkbox> -->
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
        :name="tableProps.expand ? 'mdi-chevron-down' : 'mdi-chevron-right'"
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
        {{
          col.name === "title"
            ? getTitle(tableProps.row, settingStore.showTranslatedTitle)
            : col.value
        }}
      </div>
    </q-td>

    <TableProjectMenu
      :projectId="tableProps.key"
      @expandRow="expandRow"
      @exportCitation="(project: Project) => showExportCitationDialog(project)"
      ref="menu"
    />
  </q-tr>
</template>

<script setup lang="ts">
import { copyToClipboard, useQuasar } from "quasar";
import { Author, Project } from "src/backend/database";
import { formatMetaData } from "src/backend/meta";
import { getTitle } from "src/backend/utils";
import { useSettingStore } from "src/stores/settingStore";
import { PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import { exportDialog } from "../dialogs/dialogController";
import TableProjectMenu from "./TableProjectMenu.vue";
const { t } = useI18n({ useScope: "global" });

const settingStore = useSettingStore();
const menu = ref<InstanceType<typeof TableProjectMenu>>();
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
    required: true,
  },
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
 * @param {Project} project - The project to export the citation for.
 */
async function showExportCitationDialog(project: Project) {
  exportDialog.show();
  exportDialog.onConfirm(async () => {
    const format = exportDialog.format.value;
    const options = { template: exportDialog.template.value };
    const meta = await formatMetaData([project], format, options);
    await copyToClipboard(meta as string);
    $q.notify(t("text-copied"));
  });
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
      if (authors[i].literal) surnames.push(authors[i].literal);
      else surnames.push(authors[i].family);
    }
    return surnames.join(" and ");
  } else {
    let author = authors[0];
    if (author.literal) return author.literal;
    else return `${author.family} et al.`;
  }
}
</script>
<style scoped lang="scss"></style>
