<template>
  <q-tr
    no-hover
    class="cursor-pointer non-selectable"
    @click="clickItem"
    @dblclick="openItem"
  >
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
      v-else
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

    <q-menu
      touch-position
      context-menu
      square
      auto-close
      transition-duration="0"
      data-cy="menu"
    >
      <q-list
        v-if="item.dataType === 'note'"
        dense
      >
        <q-item
          clickable
          @click="copyID"
        >
          <q-item-section>{{ $t("copy-note-id") }}</q-item-section>
        </q-item>
        <q-item
          clickable
          @click="showInExplorer"
        >
          <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
        </q-item>

        <q-separator />

        <q-item
          clickable
          @click="openItem"
          data-cy="btn-open-item"
        >
          <q-item-section>{{ $t("open-note") }}</q-item-section>
        </q-item>
        <q-item
          clickable
          @click="setRenaming"
          :disable="item.label === item.projectId + '.md'"
        >
          <q-item-section>{{ $t("rename-note") }}</q-item-section>
        </q-item>
        <q-item
          clickable
          @click="deleteItem"
          :disable="item.label === item.projectId + '.md'"
        >
          <q-item-section>{{ $t("delete-note") }}</q-item-section>
        </q-item>
      </q-list>

      <q-list
        v-else
        dense
      >
        <q-item
          clickable
          @click="openItem"
        >
          <q-item-section>{{ $t("open-pdf") }}</q-item-section>
        </q-item>
        <q-item
          clickable
          @click="showInExplorer"
        >
          <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
        </q-item>

        <q-item
          clickable
          @click="renameFile"
        >
          <q-item-section>{{ $t("rename-pdf-from-metadata") }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-tr>
</template>
<script setup lang="ts">
// types
import { PropType, Ref, inject, ref, watchEffect, nextTick } from "vue";
import { Project, Note, NoteType, db } from "src/backend/database";
// db
import { useStateStore } from "src/stores/appState";
import { useProjectStore } from "src/stores/projectStore";
import { copyToClipboard } from "quasar";
import { basename, join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api";
import { exists } from "@tauri-apps/api/fs";
import { oldToNewId } from "src/backend/project/utils";

const props = defineProps({
  item: { type: Object as PropType<Project | Note>, required: true },
});
const stateStore = useStateStore();
const projectStore = useProjectStore();

const renaming = ref(false);
const renameInput = ref<HTMLInputElement | null>(null);
const label = ref("");
const renamingNoteId = inject("renamingNoteId") as Ref<string>;
const oldNoteName = ref("");
const pathDuplicate = ref(false);

const updateComponent = inject("updateComponent") as (
  oldItemId: string,
  state: { id: string; label: string }
) => Promise<void>;

watchEffect(async () => {
  // label changes whenever pdf is renamed
  if (props.item.path) label.value = await basename(props.item.path);

  // if the note is newly added, rename it immediately
  if (renamingNoteId.value === props.item._id) setRenaming();
});

function copyID() {
  copyToClipboard(props.item._id);
}

async function showInExplorer() {
  if (!props.item.path) return;
  await invoke("show_in_folder", {
    path: props.item.path,
  });
}

function clickItem() {
  projectStore.selected = [props.item];
}

function openItem() {
  let id = props.item._id;
  let label = props.item.label;
  let type = "";
  if (props.item.dataType === "project") {
    if (props.item.path) type = "ReaderPage";
  } else if ((props.item as Project | Note).dataType === "note") {
    if (props.item.type === NoteType.EXCALIDRAW) type = "ExcalidrawPage";
    else type = "NotePage";
  }
  stateStore.openPage({ id, type, label });
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
    const newLabel = label.value;
    const newNoteId = await oldToNewId(oldNoteId, newLabel);
    // update window tab name
    updateComponent(oldNoteId, {
      id: newNoteId,
      label: newLabel,
    });
    await nextTick(); // wait until itemId changes in the page
    await projectStore.renameNote(oldNoteId, newNoteId);
  }
  renaming.value = false;
  renamingNoteId.value = "";
  pathDuplicate.value = false;
}

async function deleteItem() {
  await projectStore.deleteNote(props.item._id);
}

async function renameFile() {
  await projectStore.renamePDF(props.item._id);
}

async function checkDuplicate() {
  const extension =
    props.item.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  const path = await join(
    db.storagePath,
    props.item.projectId,
    label.value + extension
  );

  if ((await exists(path)) && path !== props.item.path)
    pathDuplicate.value = true;
  else pathDuplicate.value = false;
}
</script>
