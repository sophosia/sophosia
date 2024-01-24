<template>
  <q-splitter
    style="position: absolute; width: 100%; height: 100%"
    :limits="[10, 30]"
    separator-class="q-splitter-separator"
    v-model="treeViewSize"
  >
    <template v-slot:before>
      <FolderTree
        style="background: var(--color-library-treeview-bkgd)"
        @exportFolder="(folder: Folder) => showExportReferenceDialog(folder)"
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
          hidden: !stateStore.showLibraryRightMenu,
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
            @showIdentifierDialog="showIdentifierDialog()"
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
import { nextTick, onMounted, ref, watch } from "vue";
// types
import { Folder, Project } from "src/backend/database";
// components
import ActionBar from "src/components/library/ActionBar.vue";
import FolderTree from "src/components/library/FolderTree.vue";
import ProjectTable from "src/components/library/ProjectTable.vue";
import RightMenu from "src/components/library/RightMenu.vue";
// db
import { basename, extname } from "@tauri-apps/api/path";
import { template } from "lodash";
import { copyFileToProjectFolder } from "src/backend/project/file";
import {
  exportMeta,
  getMeta,
  getMetaFromFile,
  importMeta,
} from "src/backend/project/meta";
import {
  exportDialog,
  identifierDialog,
  importDialog,
} from "src/components/dialogs/dialogController";
import { useProjectStore } from "src/stores/projectStore";
import { useStateStore } from "src/stores/stateStore";

const stateStore = useStateStore();
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

watch(
  () => stateStore.selectedFolderId,
  async (folderId: string) => {
    projectStore.selected = [];
    projectStore.loadProjects(folderId);
  }
);

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
 * Open identifier dialog.
 * If createProject is true, the identifier will be used to create a new project
 * otherwise the identifier will be used to update an existing project
 * @param createProject
 */
function showIdentifierDialog() {
  identifierDialog.show();
  identifierDialog.onConfirm(async () => {
    await addProjectByIdentifier(identifierDialog.identifier);
    identifierDialog.identifier = "";
  });
}

function showImportDialog(collectionPath: string) {
  importDialog.show();
  importDialog.onConfirm(() => {
    addProjectsByCollection(collectionPath, importDialog.isCreateFolder);
  });
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
        label: title,
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
async function addProjectsByCollection(
  collectionPath: string,
  isCreateFolder: boolean
) {
  if (collectionPath === "") return;
  // create folder if user wants to
  if (isCreateFolder) {
    if (!treeview.value) return;
    let rootNode = treeview.value.getLibraryNode();
    if (!rootNode) return;
    let folderName = await basename(
      collectionPath,
      `.${await extname(collectionPath)}`
    );

    let focus = true;
    await treeview.value.addFolder(rootNode, folderName, focus);
  }

  await nextTick(); //wait until ui actions settled

  let metas = await importMeta(collectionPath);
  for (let meta of metas) {
    // add a new project to db and update it with meta
    let project = projectStore.createProject(stateStore.selectedFolderId);
    await projectStore.addProject(project, true);
    await projectStore.updateProject(project._id, meta as Project);
  }
}

async function addProjectByIdentifier(identifier: string) {
  const metas = await getMeta([identifier], "json");
  const meta = metas[0];
  // add a new project to db and update it with meta
  const project = projectStore.createProject(stateStore.selectedFolderId);
  await projectStore.addProject(project, true);
  await projectStore.updateProject(project._id, meta as Project);
}

function showExportReferenceDialog(folder: Folder) {
  exportDialog.show();
  exportDialog.onConfirm(async () => {
    let options = undefined;
    const format = exportDialog.format.value;
    if (format === "bibliography")
      options = { template: exportDialog.template.value };
    await exportFolder(format, folder, options);
  });
}
/**********************************************************
 * FolderTree
 **********************************************************/

/**
 * Export a folder as a collection of references
 * @param format - citation.js suported format
 * @param options - extra options
 */
async function exportFolder(
  format: string,
  folder: Folder,
  options?: { format?: string; template?: string }
) {
  await exportMeta(folder, format, options);
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
