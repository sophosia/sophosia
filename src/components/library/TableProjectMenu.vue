<template>
  <q-menu
    touch-position
    context-menu
    square
    transition-duration="0"
    class="menu"
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
                projectStore.selected[0] as Meta, settingStore.citeKeyRule
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
        clickable
        v-close-popup
        @click="showInExplorer"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>
      <q-item
        v-if="projectStore.selected.length === 1"
        clickable
        v-close-popup
        @click="showInNewWindow()"
      >
        <q-item-section>
          {{ $t("open-page-in-new-window") }}
        </q-item-section>
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
        v-if="projectStore.selected.length == 1 && projectType !== 'notebook'"
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
        @click="uploadProject"
      >
        <q-item-section>
          <i18n-t keypath="upload">
            <template #type>{{ $t("file") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-item
        v-if="projectStore.selected.length == 1"
        clickable
        v-close-popup
        @click="showIdentifierDialog()"
      >
        <q-item-section>
          <i18n-t keypath="search">
            <template #type>{{ $t("info") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-item
        v-if="
          projectStore.selectedCategory != SpecialCategory.LIBRARY.toString()
        "
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
  PageType,
  Project,
  SpecialCategory,
  db,
} from "src/backend/database";
import { Ref, inject, nextTick, ref } from "vue";
// db
import { invoke } from "@tauri-apps/api";
import { join } from "@tauri-apps/api/path";
import { copyToClipboard } from "quasar";
import { uploadPDF } from "src/backend/conversationAgent/uploadPDF";
import { generateCiteKey, getMeta } from "src/backend/meta";
import { getProject } from "src/backend/project";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import { watchEffect } from "vue";
import {
  deleteDialog,
  errorDialog,
  identifierDialog,
} from "../dialogs/dialogController";

const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();

const props = defineProps({
  projectId: { type: String, required: true },
});
const emit = defineEmits(["expandRow", "exportCitation"]);

const renamingNoteId = inject("renamingNoteId") as Ref<string>;
const projectType = ref<string>();
watchEffect(async () => {
  const project = await getProject(props.projectId);
  projectType.value = project?.type;
});

/**
 * Handles the export of the citation information for the selected project.
 * Copies the citation to the clipboard or performs an export action.
 */
function exportCitation() {
  let project = projectStore.getProject(props.projectId); //grab the project that's clicked
  emit("exportCitation", project);
}

/**
 * Handles the expansion of a row in the table.
 * @param {boolean} isExpand - Indicates whether to expand or collapse the row.
 */
function expandRow(isExpand: boolean) {
  emit("expandRow", isExpand);
}

/**
 * Adds a new note of the specified type to the selected project.
 * @param {NoteType} noteType - The type of note to add (Markdown or Excalidraw).
 */
async function addNote(noteType: NoteType) {
  let project = projectStore.selected[0];
  let note = await projectStore.createNode(project._id, "note", noteType);
  await projectStore.addNode(note);
  expandRow(true);
  await nextTick();
  renamingNoteId.value = note._id;
}

/**
 * Opens the selected project(s) for viewing and editing.
 */
async function openProject() {
  for (let project of projectStore.selected) {
    layoutStore.openItem(project._id);
    await nextTick();
  }
}

/**
 * Uploads the selected project(s) to the conversation agent.
 */
import { useQuasar } from "quasar";
import { useI18n } from "vue-i18n";
const $q = useQuasar();
const { t } = useI18n();

async function uploadProject() {
  for (let project of projectStore.selected) {
    const check = await uploadPDF(project._id);
    if (check.status == false && check.error) {
      errorDialog.show();
      errorDialog.error.name = "Upload Error";
      errorDialog.error.message = check.error;
    }
    if (check.status === true) {
      $q.notify({
        message: t("file-upload", { type: project.label }),
        position: "top-right",
      });
    }
    console.log(check);
    await nextTick();
  }
}

/**
 * Opens the file explorer and navigates to the location of the selected project(s).
 */
async function showInExplorer() {
  for (let project of projectStore.selected) {
    let path = await join(db.config.storagePath, project._id);
    await invoke("show_in_folder", {
      path: path,
    });
  }
}

function showInNewWindow() {
  const project = projectStore.selected[0];
  layoutStore.showInNewWindow({
    id: project._id,
    type: PageType.ReaderPage,
    label: project.label,
  });
}

/**
 * Deletes the selected project(s) from either the folder or the database.
 * @param {boolean} deleteFromDB - Indicates whether to delete from the database or just from the folder.
 */
function showDeleteDialog(deleteFromDB: boolean) {
  deleteDialog.show();
  deleteDialog.deleteProjects = projectStore.selected as Project[];
  deleteDialog.isDeleteFromDB = deleteFromDB;
  deleteDialog.onConfirm(() =>
    deleteProject(
      projectStore.selectedCategory,
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
 * Open identifier dialog for user to input identifier
 * Then update the project using the identifier
 * @param createProject
 */
function showIdentifierDialog() {
  identifierDialog.show();
  identifierDialog.onConfirm(async () => {
    const metas = await getMeta([identifierDialog.identifier]);
    const meta = metas[0];
    // update existing project
    meta["citation-key"] = generateCiteKey(meta, settingStore.citeKeyRule);
    (meta as Project)._id = generateCiteKey(meta, settingStore.projectIdRule);
    await projectStore.updateProject(
      projectStore.selected[0]._id,
      meta as Project
    );
    identifierDialog.identifier = "";
  });
}

/**
 * Attaches a PDF file to the selected project.
 */
async function onAttachFile() {
  await projectStore.attachPDF(props.projectId);
  expandRow(true);
}

/**
 * Sets the favorite status of the project to the specified value.
 * @param {boolean} isFavorite - Indicates whether the project should be marked as a favorite.
 */
async function setFavorite(isFavorite: boolean) {
  await projectStore.updateProject(props.projectId, {
    favorite: isFavorite,
  } as Project);
}

defineExpose({ setFavorite });
</script>
