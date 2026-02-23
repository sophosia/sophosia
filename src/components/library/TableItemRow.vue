<template>
  <q-tr
    no-hover
    class="cursor-pointer non-selectable"
    @click="clickItem"
    @dblclick="openItem"
  >
    <q-td auto-width></q-td>
    <q-td auto-width></q-td>
    <q-td auto-width></q-td>
    <q-td
      v-if="item.dataType === 'note'"
      colspan="100%"
    >
      <div
        class="row items-center"
        data-cy="content"
      >
        <NodeTypeIcon :node="item" :size="14" />
        <div
          v-if="renaming"
          class="row"
        >
          <q-input
            v-model="label"
            @update:model-value="checkDuplicate()"
            outlined
            dense
            :color="pathDuplicate ? 'red' : ''"
            @blur="renameNote"
            @keydown.enter="renameNote"
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
          style="font-size: 0.875rem"
          class="q-ml-xs"
        >
          {{ label }}
        </div>
      </div>
    </q-td>
    <q-td
      v-else-if="item.dataType === 'project'"
      colspan="100%"
    >
      <div class="row items-center">
        <NodeTypeIcon :node="item" :size="14" />
        <div
          class="col"
          style="font-size: 0.875rem"
        >
          {{ label }}
        </div>
      </div>
    </q-td>
    <q-td
      v-else
      colspan="100%"
    >
      <div class="row items-center">
        <NodeTypeIcon :node="item" :size="14" />
        <div
          class="col"
          style="font-size: 0.875rem"
        >
          {{ label }}
        </div>
      </div>
    </q-td>

    <TableItemMenu
      :menuType="item.dataType"
      @showInExplorer="showInExplorer"
      @showInNewWindow="showInNewWindow"
      @openItem="openItem"
      @setRenaming="setRenaming"
      @deleteItem="deleteItem"
      @renamePDF="renamePDF"
      @copyId="() => copyId(item._id)"
      @copyAsLink="() => copyAsNoteLink(item)"
    />
  </q-tr>
</template>
<script setup lang="ts">
import { Note, FolderOrNote, Project } from "src/backend/database";
import { PropType, Ref, inject, ref, watchEffect } from "vue";
import { invoke } from "@tauri-apps/api";
import { basename } from "@tauri-apps/api/path";
import { idToPath } from "src/backend/utils";
import { useProjectActions } from "src/composables/useProjectActions";
import { useNodeActions } from "src/composables/useNodeActions";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import TableItemMenu from "./TableItemMenu.vue";
import NodeTypeIcon from "src/components/shared/NodeTypeIcon.vue";

const props = defineProps({
  item: { type: Object as PropType<Project | Note>, required: true },
});
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();
const settingStore = useSettingStore();
const {
  showInNewWindow: showInNewWindowAction,
  copyId,
  copyAsNoteLink,
} = useProjectActions();
const {
  pathDuplicate,
  checkDuplicate: checkDuplicateAction,
  deleteNode,
  renameNote: doRenameNote,
} = useNodeActions();

const renaming = ref(false);
const renameInput = ref<HTMLInputElement | null>(null);
const label = ref("");
const renamingNoteId = inject("renamingNoteId") as Ref<string>;
const oldNoteName = ref("");

watchEffect(async () => {
  const path = props.item.path || idToPath(props.item._id);
  label.value = await basename(path);
  if (renamingNoteId.value === props.item._id) setRenaming();
});

async function showInExplorer() {
  const path =
    props.item.dataType === "project"
      ? props.item.path
      : idToPath(props.item._id);
  if (!path) return;
  await invoke("show_in_folder", { path: path });
}

function showInNewWindow() {
  showInNewWindowAction(props.item);
}

function clickItem() {
  projectStore.selected = [props.item];
}

function openItem() {
  layoutStore.openItem(props.item._id);
}

function setRenaming() {
  renaming.value = true;
  oldNoteName.value = props.item.label;
  pathDuplicate.value = false;

  setTimeout(() => {
    let input = renameInput.value as HTMLInputElement;
    input.focus();
    input.select();
  }, 100);
}

async function renameNote() {
  await doRenameNote(
    props.item._id,
    label.value,
    () => {
      renaming.value = false;
      renamingNoteId.value = "";
    },
    () => {
      (props.item as Note).label = oldNoteName.value;
      label.value = oldNoteName.value;
      renaming.value = false;
      renamingNoteId.value = "";
    }
  );
}

async function deleteItem() {
  await deleteNode(props.item as FolderOrNote);
}

async function renamePDF() {
  await projectStore.renamePDF(props.item._id, settingStore.pdfRenameRule);
}

async function checkDuplicate() {
  await checkDuplicateAction(props.item as Note, label.value);
}
</script>
