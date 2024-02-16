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
          name="mdi-fountain-pen-tip"
        />
        <q-icon
          v-else
          size="xs"
          name="mdi-language-markdown-outline"
        />
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
          name="mdi-folder-outline"
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
      @showInNewWindow="showInNewWindow"
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
import { Note, NoteType, Page, PageType, Project } from "src/backend/database";
import { PropType, Ref, inject, nextTick, ref, watchEffect } from "vue";
// db
import { invoke } from "@tauri-apps/api";
import { exists } from "@tauri-apps/api/fs";
import { basename, dirname, join } from "@tauri-apps/api/path";
import { copyToClipboard } from "quasar";
import { idToPath, oldToNewId } from "src/backend/project/utils";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import TableItemMenu from "./TableItemMenu.vue";

const props = defineProps({
  item: { type: Object as PropType<Project | Note>, required: true },
});
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
  const path = props.item.path || idToPath(props.item._id);
  label.value = await basename(path);

  // if the note is newly added, rename it immediately
  if (renamingNoteId.value === props.item._id) setRenaming();
});

/**
 * Opens the file explorer and navigates to the location of the item.
 * If the item is a project, it opens the directory containing the project files.
 * If the item is a note, it opens the directory containing the note file.
 */
async function showInExplorer() {
  const path =
    props.item.dataType === "project"
      ? props.item.path
      : idToPath(props.item._id);
  if (!path) return;
  await invoke("show_in_folder", { path: path });
}

function showInNewWindow() {
  const type = props.item._id.endsWith(".md")
    ? PageType.NotePage
    : PageType.ExcalidrawPage;
  layoutStore.showInNewWindow({
    id: props.item._id,
    type: type,
    label: props.item.label,
  });
}

/**
 * Handles a single-click event on the item row.
 * Selects the item when clicked.
 */
function clickItem() {
  projectStore.selected = [props.item];
}

/**
 * Handles a double-click event on the item row.
 * Opens the item for further interaction.
 */
function openItem() {
  layoutStore.openItem(props.item._id);
}

/**
 * Initiates the renaming of the item.
 * Enables the user to edit the item's label.
 */
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

/**
 * Renames a note item.
 * Updates the item's label and updates the window tab name.
 * If a name collision occurs, reverts the name to the previous one.
 */
async function renameNote() {
  let note = props.item as Note;
  if (pathDuplicate.value) {
    console.log("oldname", oldNoteName.value);
    note.label = oldNoteName.value;
    label.value = oldNoteName.value;
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

/**
 * Deletes the item from the project.
 */
async function deleteItem() {
  await projectStore.deleteNode(props.item._id, "note");
}

/**
 * Renames a PDF item.
 */
async function renamePDF() {
  await projectStore.renamePDF(props.item._id);
}

/**
 * Checks for duplicate names when renaming an item.
 * Sets the `pathDuplicate` flag to `true` if a duplicate name is found.
 */
async function checkDuplicate() {
  const extension =
    props.item.type === NoteType.EXCALIDRAW ? ".excalidraw" : ".md";
  const path = await join(
    await dirname(idToPath(props.item._id)),
    label.value.endsWith(extension) ? label.value : label.value + extension
  );

  if ((await exists(path)) && path !== idToPath(props.item._id))
    pathDuplicate.value = true;
  else pathDuplicate.value = false;
}
</script>
