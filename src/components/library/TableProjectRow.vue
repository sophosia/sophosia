<template>
  <q-tr class="table">
    <q-th auto-width>
      <input
        type="checkbox"
        class="checkbox"
        v-model="tableProps.selected"
        @mousedown.stop
      />
    </q-th>
    <q-th auto-width>
      <q-checkbox
        dense
        size="sm"
        color="warning"
        checked-icon="star"
        unchecked-icon="star_border"
        :model-value="!!tableProps.row.favorite"
        @update:model-value="(isFavorite: boolean) => menu?.setFavorite(isFavorite)"
        @mousedown.stop
      />
    </q-th>
    <q-td auto-width>
      <component
        v-if="!!tableProps.row.path || (tableProps.row.children?.length as typeof NaN) > 0"
        :is="tableProps.expand ? NavArrowDown : NavArrowRight"
        width="16"
        height="16"
        class="cursor-pointer"
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
import { NavArrowDown, NavArrowRight } from "@iconoir/vue";

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

function expandRow(isExpand: boolean) {
  emit("expandRow", isExpand);
}

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

function shortAuthorString(authors: Author[]) {
  if (!authors || authors.length === 0) return "";

  const surname = (a: Author) => a.literal || a.family;

  if (authors.length === 1) return surname(authors[0]);
  if (authors.length === 2) return authors.map(surname).join(" and ");
  return `${surname(authors[0])} et al.`;
}
</script>
<style scoped lang="scss"></style>
