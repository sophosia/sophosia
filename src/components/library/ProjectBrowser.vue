<template>
  <ImportDialog
    v-model:show="importDialog"
    @confirm="(isCreateFolder) => addProjectsByCollection(isCreateFolder)"
  />
  <ExportDialog
    v-model:show="exportFolderDialog"
    @confirm="(format, options) => exportFolder(format, options)"
  />
  <IdentifierDialog
    v-model:show="identifierDialog"
    @confirm="(identifier) => processIdentifier(identifier)"
  />
  <DeleteDialog
    v-model:show="deleteDialog"
    :projects="deleteProjects"
    :deleteFromDB="deleteFromDB"
    @confirm="deleteProject"
  />

  <q-splitter
    style="position: absolute; width: 100%; height: 100%"
    :limits="[10, 30]"
    separator-class="q-splitter-separator"
    v-model="treeViewSize"
  >
    <template v-slot:before>
      <FolderTree
        style="background: var(--color-library-treeview-bkgd)"
        @exportFolder="(folder: Folder) => showExportFolderDialog(folder)"
        ref="treeview"
      />
    </template>
    <template v-slot:after>
      <q-splitter
        style="overflow: hidden"
        reverse
        :limits="[0, 60]"
        separator-style="background: var(--q-edge)"
        :separator-class="{
          'q-splitter-separator': stateStore.showLibraryRightMenu,
          hidden: !stateStore.showLibraryRightMenu
        }"
        :disable="!stateStore.showLibraryRightMenu"
        v-model="rightMenuSize"
        emit-immediately
        @update:model-value="(size: number) => resizeRightMenu(size)"
      >
        <template v-slot:before>
          <ActionBar
            style="
              min-height: 36px;
              background: var(--color-library-toolbar-bkgd);
            "
            v-model:searchString="searchString"
            @addEmptyProject="addEmptyProject"
            @addByFiles="(filePaths) => addProjectsByFiles(filePaths)"
            @addByCollection="
              (collectionPath) => showImportDialog(collectionPath)
            "
            @showIdentifierDialog="showIdentifierDialog(true)"
            ref="actionBar"
          />
          <!-- actionbar height 36px, table view is 100%-36px -->
          <ProjectTable
            v-model:projects="projectStore.projects"
            :searchString="searchString"
            style="
              height: calc(100% - 36px);
              width: 100%;
              background: var(--color-library-tableview-bkgd);
            "
            ref="table"
          />
        </template>
        <template v-slot:after>
          <RightMenu />
        </template>
      </q-splitter>
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
import { ref, watch, provide, onMounted, inject, nextTick } from "vue";
// types
import { Folder, Note, Project } from "src/backend/database";
import { KEY_metaDialog, KEY_deleteDialog } from "./injectKeys";
// components
import ActionBar from "src/components/library/ActionBar.vue";
import ProjectTable from "src/components/library/ProjectTable.vue";
import FolderTree from "src/components/library/FolderTree.vue";
import RightMenu from "src/components/library/RightMenu.vue";
import ExportDialog from "src/components/library/ExportDialog.vue";
import IdentifierDialog from "src/components/library/IdentifierDialog.vue";
import DeleteDialog from "src/components/library/DeleteDialog.vue";
import ImportDialog from "src/components/library/ImportDialog.vue";
// db
import { useStateStore } from "src/stores/appState";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import {
  getMeta,
  exportMeta,
  importMeta,
  getMetaFromFile
} from "src/backend/project/meta";
import { copyFileToProjectFolder } from "src/backend/project/file";
import { basename, extname } from "@tauri-apps/api/path";

const stateStore = useStateStore();
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();

/*********************************
 * Data
 *********************************/
// component refs
const treeview = ref<typeof FolderTree | null>(null);

// data
const searchString = ref("");

const treeViewSize = ref(20);
const rightMenuSize = ref(0);

const exportFolderDialog = ref(false);
const folder = ref<Folder | null>(null);

const deleteDialog = ref(false);
const deleteProjects = ref<Project[]>([]);
const deleteFromDB = ref(false);

const identifierDialog = ref(false);
const createProject = ref(false);

const importDialog = ref(false);
const collectionPath = ref<string>("");

watch(
  () => stateStore.selectedFolderId,
  async (folderId: string) => {
    projectStore.selected = [];
    projectStore.loadProjects(folderId);
  }
);

// for projectRow
provide(KEY_deleteDialog, showDeleteDialog);
provide(KEY_metaDialog, showSearchMetaDialog);

onMounted(async () => {
  projectStore.loadProjects(stateStore.selectedFolderId);
  // rightmenu
  if (stateStore.showLibraryRightMenu)
    rightMenuSize.value = stateStore.libraryRightMenuSize;
});

/************************************************
 * Projects (get, add, delete, update, attachFile, renameFromMeta)
 ************************************************/
/**
 * Delete project
 * @param project
 * @param deleteFromDB
 */
function showDeleteDialog(_deleteProjects: Project[], _deleteFromDB: boolean) {
  deleteDialog.value = true;
  deleteProjects.value = _deleteProjects; // project to be delted
  deleteFromDB.value = _deleteFromDB;
}

/**
 * Update project by meta
 */
function showSearchMetaDialog() {
  let createProject = false;
  showIdentifierDialog(createProject);
}

/**
 * Open identifier dialog.
 * If createProject is true, the identifier will be used to create a new project
 * otherwise the identifier will be used to update an existing project
 * @param createProject
 */
function showIdentifierDialog(_createProject: boolean) {
  identifierDialog.value = true;
  createProject.value = _createProject;
}

function showImportDialog(_collectionPath: string) {
  importDialog.value = true;
  collectionPath.value = _collectionPath;
}

/**
 * Add an empty project to table
 */
async function addEmptyProject() {
  // udpate db and ui
  let project = projectStore.createProject(stateStore.selectedFolderId);
  projectStore.addProject(project, true);
}

/**
 * Add projects by importing files
 * @param filePaths - pdfs paths imported
 */
async function addProjectsByFiles(filePaths: string[]) {
  for (let filePath of filePaths) {
    try {
      let project = projectStore.createProject(stateStore.selectedFolderId);
      await projectStore.addProject(project, true);
      let filename = (await copyFileToProjectFolder(
        filePath,
        project._id
      )) as string;
      let title = await basename(filename, ".pdf");
      await projectStore.updateProject(project._id, {
        path: filename,
        title: title,
        label: title
      } as Project);
      // do not use await since this task takes time
      getMetaFromFile(filePath).then((meta) => {
        if (meta) projectStore.updateProject(project._id, meta as Project);
      });
    } catch (error) {
      console.log(error);
    }
  }
}

/**
 * Add projects by a collection file (.bib, .ris, etc...)
 * @param isCreateFolder
 */
async function addProjectsByCollection(isCreateFolder: boolean) {
  if (collectionPath.value === "") return;
  // create folder if user wants to
  if (isCreateFolder) {
    if (!treeview.value) return;
    let rootNode = treeview.value.getLibraryNode();
    if (!rootNode) return;
    let folderName = await basename(
      collectionPath.value,
      `.${await extname(collectionPath.value)}`
    );

    let focus = true;
    await treeview.value.addFolder(rootNode, folderName, focus);
  }

  await nextTick(); //wait until ui actions settled

  let metas = await importMeta(collectionPath.value);
  for (let meta of metas) {
    // add a new project to db and update it with meta
    let project = projectStore.createProject(stateStore.selectedFolderId);
    await projectStore.addProject(project, true);
    await projectStore.updateProject(project._id, meta as Project);
  }

  importDialog.value = false;
  collectionPath.value = "";
}

async function processIdentifier(identifier: string) {
  if (!identifier) return;

  let metas = await getMeta([identifier], "json");
  let meta = metas[0];

  if (createProject.value) {
    // add a new project to db and update it with meta
    let project = projectStore.createProject(stateStore.selectedFolderId);
    await projectStore.addProject(project, true);
    await projectStore.updateProject(project._id, meta as Project);
  } else {
    // update existing project
    await projectStore.updateProject(
      projectStore.selected[0]._id,
      meta as Project
    );
  }
}

/**
 * Delete a project from the current folder,
 * if deleteFromDB is true, delete the project from database and remove the actual files
 */
async function deleteProject() {
  // delete projects
  let deleteIds = projectStore.selected.map((p) => p._id);

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
    projectStore.deleteProject(
      projectId,
      deleteFromDB.value,
      stateStore.selectedFolderId
    );
  }
}

/**********************************************************
 * FolderTree
 **********************************************************/

function showExportFolderDialog(_folder: Folder) {
  folder.value = _folder;
  exportFolderDialog.value = true;
}

/**
 * Export a folder as a collection of references
 * @param format - citation.js suported format
 * @param options - extra options
 */
async function exportFolder(
  format: string,
  options: { format?: string; template?: string }
) {
  if (!!!folder.value) return;
  console.log(folder.value);

  await exportMeta(folder.value, format, options);
}

/**************************************************
 * MetaInfoTab
 **************************************************/
watch(
  () => stateStore.showLibraryRightMenu,
  (visible: boolean) => {
    if (visible) {
      // if visible, the left menu has at least 10 unit width
      rightMenuSize.value = Math.max(stateStore.libraryRightMenuSize, 15);
    } else {
      // if not visible, record the size and close the menu
      stateStore.libraryRightMenuSize = rightMenuSize.value;
      rightMenuSize.value = 0;
    }
  }
);

function resizeRightMenu(size: number) {
  if (size < 20) {
    rightMenuSize.value = 0;
    stateStore.showLibraryRightMenu = false;
  }
  stateStore.libraryRightMenuSize = size > 10 ? size : 30;
}
</script>
