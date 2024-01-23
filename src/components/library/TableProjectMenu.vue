<template>
  <q-menu
    touch-position
    context-menu
    square
    transition-duration="0"
  >
    <q-list dense>
      <q-item
        v-if="projectStore.selected.length <= 1"
        clickable
        v-close-popup
        @click="
          () => {
            $q.notify($t('text-copied'));
            copyToClipboard(projectId);
          }
        "
      >
        <q-item-section>
          <i18n-t keypath="copy-id">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        v-if="projectStore.selected.length <= 1"
        clickable
        v-close-popup
        @click="
          () => {
            $q.notify($t('text-copied'));
            copyToClipboard(
              `[${generateCiteKey(
                projectStore.selected[0] as Meta
              )}](sophosia://open-item/${projectId})`
            );
          }
        "
      >
        <q-item-section>
          <i18n-t keypath="copy-as-link">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        v-if="projectStore.selected.length <= 1"
        clickable
        v-close-popup
        @click="exportCitation"
      >
        <q-item-section>
          {{ $t("copy-reference") }}
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        v-if="projectStore.selected.length <= 1"
        clickable
        v-close-popup
        @click="showInExplorer"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>

      <q-separator v-if="projectStore.selected.length == 1" />

      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="addNote(NoteType.MARKDOWN)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>Markdown</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="addNote(NoteType.EXCALIDRAW)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>Excalidraw</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="onAttachFile()"
      >
        <q-item-section>
          {{
            !!projectStore.selected[0].path
              ? $t("replace-file")
              : $t("attach-file")
          }}
        </q-item-section>
      </q-item>

      <q-separator />
      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="openProject"
      >
        <q-item-section>
          <i18n-t keypath="open">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="searchMeta"
      >
        <q-item-section>
          <i18n-t keypath="search">
            <template #type>{{ $t("info") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-item
        v-if="stateStore.selectedFolderId != SpecialFolder.LIBRARY.toString()"
        clickable
        v-close-popup
        @click="showDeleteDialog(false)"
      >
        <q-item-section>{{ $t("delete-from-folder") }}</q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="showDeleteDialog(true)"
      >
        <q-item-section>{{ $t("delete-from-database") }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
// types
import { QMenu } from "quasar";
import {
  Meta,
  Note,
  NoteType,
  Project,
  SpecialFolder,
  db,
} from "src/backend/database";
import { Ref, inject, nextTick } from "vue";
import { KEY_metaDialog } from "./injectKeys";
// db
import { invoke } from "@tauri-apps/api";
import { join } from "@tauri-apps/api/path";
import { copyToClipboard } from "quasar";
import { generateCiteKey } from "src/backend/project/meta";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useStateStore } from "src/stores/stateStore";
import { deleteDialog } from "../dialogs/dialogController";

const stateStore = useStateStore();
const projectStore = useProjectStore();
const layoutStore = useLayoutStore();

const props = defineProps({
  projectId: { type: String, required: true },
});
const emit = defineEmits(["expandRow", "exportCitation"]);

const renamingNoteId = inject("renamingNoteId") as Ref<string>;

// dialogs
const showSearchMetaDialog = inject(KEY_metaDialog) as () => void;

function exportCitation() {
  let project = projectStore.getProject(props.projectId); //grab the project that's clicked
  emit("exportCitation", project);
}

function expandRow(isExpand: boolean) {
  emit("expandRow", isExpand);
}

async function addNote(noteType: NoteType) {
  let project = projectStore.selected[0];
  let note = await projectStore.createNode(project._id, "note", noteType);
  await projectStore.addNode(note);
  expandRow(true);
  await nextTick();
  renamingNoteId.value = note._id;
}

async function openProject() {
  for (let project of projectStore.selected) {
    stateStore.openItem(project._id);
    await nextTick();
  }
}

async function showInExplorer() {
  for (let project of projectStore.selected) {
    let path = await join(db.config.storagePath, project._id);
    await invoke("show_in_folder", {
      path: path,
    });
  }
}

function showDeleteDialog(deleteFromDB: boolean) {
  deleteDialog.show();
  deleteDialog.deleteProjects = projectStore.selected as Project[];
  deleteDialog.isDeleteFromDB = deleteFromDB;
  deleteDialog.onConfirm(() =>
    deleteProject(
      stateStore.selectedFolderId,
      deleteDialog.deleteProjects,
      deleteDialog.isDeleteFromDB
    )
  );
}

/**
 * Delete a project from the current folder,
 * if deleteFromDB is true, delete the project from database and remove the actual files
 */
async function deleteProject(
  folderId: string,
  deleteProjects: Project[],
  isDeleteFromDB: boolean
) {
  // delete projects
  let deleteIds = deleteProjects.map((p) => p._id);

  for (let projectId of deleteIds) {
    let project = projectStore.openedProjects.find((p) => p._id === projectId);
    if (project) {
      for (let note of project.children as Note[]) {
        layoutStore.closePage(projectId);
        await nextTick(); // do it slowly one by one
        layoutStore.closePage(note._id);
      }

      // remove project from openedProjects
      projectStore.openedProjects = projectStore.openedProjects.filter(
        (p) => p._id !== projectId
      );

      // if no page left, open library page
      setTimeout(() => {
        if (projectStore.openedProjects.length === 0)
          layoutStore.currentItemId = "library";
      }, 50);
    }
    // delete from db
    projectStore.deleteProject(projectId, isDeleteFromDB, folderId);
  }
}

/**
 * Update a project by meta
 */
function searchMeta() {
  showSearchMetaDialog();
}

/**
 * Attach PDF to a project
 */
async function onAttachFile() {
  await projectStore.attachPDF(props.projectId);
  expandRow(true);
}

async function setFavorite(isFavorite: boolean) {
  await projectStore.updateProject(props.projectId, {
    favorite: isFavorite,
  } as Project);
}

defineExpose({ setFavorite });
</script>
