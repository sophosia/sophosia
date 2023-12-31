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
        <q-icon
          v-if="item.type === NoteType.EXCALIDRAW"
          size="xs"
          name="img:icons/excalidraw.png"
        />
        <q-icon
          v-else
          size="xs"
          name="mdi-language-markdown"
        />
        <div v-if="renaming">
          <input
            v-model="label"
            @input="checkDuplicate"
            @blur="renameNote"
            @keydown.enter="renameNote"
            ref="renameInput"
          />
          <q-tooltip
            v-if="pathDuplicate"
            v-model="pathDuplicate"
            class="bg-red"
          >
            name already exists
          </q-tooltip>
        </div>
        <div
          v-else
          style="font-size: 1rem"
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
        <q-icon
          class="q-mr-xs"
          size="xs"
          name="img:icons/pdf.png"
        />
        <div
          class="col"
          style="font-size: 1rem"
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
        <q-icon
          class="q-mr-xs"
          size="xs"
          name="mdi-folder"
        />
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ label }}
        </div>
      </div>
    </q-td>

    <TableItemMenu
      :menuType="item.dataType"
      @showInExplorer="showInExplorer"
      @openItem="openItem"
      @setRenaming="setRenaming"
      @deleteItem="deleteItem"
      @renamePDF="renamePDF"
      @copyId="
        () => {
          $q.notify($t('text-copied'));
          copyToClipboard(item._id);
        }
      "
      @copyAsLink="
        () => {
          $q.notify($t('text-copied'));
          copyToClipboard(`[${item._id}](${item._id})`);
        }
      "
    />
  </q-tr>
</template>
<script setup lang="ts">
// types
import { PropType, Ref, inject, ref, watchEffect, nextTick } from "vue";
import { Project, Note, NoteType, Page } from "src/backend/database";
// db
import { useStateStore } from "src/stores/appState";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { copyToClipboard } from "quasar";
import { basename, dirname, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api";
import { exists } from "@tauri-apps/api/fs";
import { IdToPath, oldToNewId } from "src/backend/project/utils";
import TableItemMenu from "./TableItemMenu.vue";

const props = defineProps({
  item: { type: Object as PropType<Project | Note>, required: true },
});
const stateStore = useStateStore();
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();

const renaming = ref(false);
const renameInput = ref<HTMLInputElement | null>(null);
const label = ref("");
const renamingNoteId = inject("renamingNoteId") as Ref<string>;
const oldNoteName = ref("");
const pathDuplicate = ref(false);

watchEffect(async () => {
  // label changes whenever pdf is renamed
  const path = props.item.path || IdToPath(props.item._id);
  label.value = await basename(path);

  // if the note is newly added, rename it immediately
  if (renamingNoteId.value === props.item._id) setRenaming();
});

async function showInExplorer() {
  const path =
    props.item.dataType === "project"
      ? props.item.path
      : IdToPath(props.item._id);
  if (!path) return;
  await invoke("show_in_folder", { path: path });
}

function clickItem() {
  projectStore.selected = [props.item];
}

function openItem() {
  stateStore.openItem(props.item._id);
}

function setRenaming() {
  renaming.value = true;
  props.item.label;
  oldNoteName.value = props.item.label;
  pathDuplicate.value = false;

  setTimeout(() => {
    let input = renameInput.value as HTMLInputElement;
    input.focus();
    input.select();
  }, 100);
}

async function renameNote() {
  let note = props.item as Note;
  if (pathDuplicate.value) {
    note.label = oldNoteName.value;
  } else {
    const oldNoteId = note._id;
    const newNoteId = await oldToNewId(oldNoteId, label.value);
    const newLabel = await basename(newNoteId);
    // update window tab name
    layoutStore.renamePage(oldNoteId, {
      id: newNoteId,
      label: newLabel,
    } as Page);
    await nextTick(); // wait until itemId changes in the page
    await projectStore.renameNode(oldNoteId, newNoteId, "note");
  }
  renaming.value = false;
  renamingNoteId.value = "";
  pathDuplicate.value = false;
}

async function deleteItem() {
  await projectStore.deleteNode(props.item._id, "note");
}

async function renamePDF() {
  await projectStore.renamePDF(props.item._id);
}

async function checkDuplicate() {
  const extension =
    props.item.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  const path = await join(
    await dirname(IdToPath(props.item._id)),
    label.value + extension
  );

  if ((await exists(path)) && path !== IdToPath(props.item._id))
    pathDuplicate.value = true;
  else pathDuplicate.value = false;
}
</script>
