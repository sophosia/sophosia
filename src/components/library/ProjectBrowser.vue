<template>
  <q-splitter
    class="project-browser-splitter"
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
        class="library-right-menu-panel"
        reverse
        :limits="[0, 60]"
        separator-style="background: var(--q-edge)"
        :separator-class="{
          'q-splitter-separator': layoutStore.libraryRightMenuSize > 0,
          hidden: !(layoutStore.libraryRightMenuSize > 0),
        }"
        :disable="!(layoutStore.libraryRightMenuSize > 0)"
        v-model="layoutStore.libraryRightMenuSize"
        @update:model-value="(size) => layoutStore.resizeLibraryRightMenu(size)"
      >
        <template v-slot:before>
          <ActionBar
            class="project-action-bar"
            v-model:searchString="searchString"
            v-model:showReferences="projectStore.showReferences"
            v-model:showNotebooks="projectStore.showNotebooks"
            @addEmptyProject="addEmptyProject"
            @addNotebook="addNotebook"
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
import {
  exportMeta,
  generateCiteKey,
  getMeta,
  getMetaFromFile,
  importMeta,
} from "src/backend/project/meta";
import { copyFileToProjectFolder } from "src/backend/project/project";
import {
  exportDialog,
  identifierDialog,
  importDialog,
} from "src/components/dialogs/dialogController";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";

const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();

/*********************************
 * Data
 *********************************/
// component refs
const treeview = ref<typeof FolderTree | null>(null);

// data
const searchString = ref("");

const treeViewSize = ref(20);

watch(
  () => [
    projectStore.selectedFolderId,
    projectStore.showNotebooks,
    projectStore.showReferences,
  ],
  async () => {
    projectStore.selected = [];
    projectStore.loadProjects(projectStore.selectedFolderId);
  },
  { deep: true }
);

onMounted(async () => {
  projectStore.loadProjects(projectStore.selectedFolderId);
});

/************************************************
 * Projects (get, add, delete, update, attachFile, renameFromMeta)
 ************************************************/

/**
 * Open identifier dialog.
 * If createProject is true, the identifier will be used to create a new project
 * otherwise the identifier will be used to update an existing project
 */
function showIdentifierDialog() {
  identifierDialog.show();
  identifierDialog.onConfirm(async () => {
    await addProjectByIdentifier(identifierDialog.identifier);
    identifierDialog.identifier = "";
  });
}

/**
 * Shows the import dialog for importing projects from a collection file.
 * @param {string} _collectionPath - The path to the collection file.
 */
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
  const project = projectStore.createProject(projectStore.selectedFolderId);
  projectStore.addProject(project, true);
}

/**
 * Add a notebook project
 */
async function addNotebook() {
  const project = projectStore.createProject(projectStore.selectedFolderId);
  project.type = "notebook";
  projectStore.addProject(project, true);
}

/**
 * Adds projects by importing files from specified file paths.
 * @param {string[]} filePaths - The paths of the files to import as projects.
 */
async function addProjectsByFiles(filePaths: string[]) {
  for (let filePath of filePaths) {
    try {
      let project = projectStore.createProject(projectStore.selectedFolderId);
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
        if (!meta) return;
        meta["citation-key"] = generateCiteKey(meta, settingStore.citeKeyRule);
        (meta as Project)._id = generateCiteKey(
          meta,
          settingStore.projectIdRule
        );
        projectStore.updateProject(project._id, meta as Project);
      });
    } catch (error) {
      console.log(error);
    }
  }
}

/**
 * Adds projects by importing projects from a collection file (.bib, ris, etc...)
 * @param {boolean} isCreateFolder - Indicates whether to create a new folder.
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
    let project = projectStore.createProject(projectStore.selectedFolderId);
    await projectStore.addProject(project, true);
    (meta as Project)._id = generateCiteKey(meta, settingStore.projectIdRule);
    await projectStore.updateProject(project._id, meta as Project);
  }
}

/**
 * Processes an identifier for creating or updating projects.
 * @param {string} identifier - The identifier used for creating or updating projects.
 */
async function addProjectByIdentifier(identifier: string) {
  const metas = await getMeta([identifier]);
  const meta = metas[0];
  // add a new project to db and update it with meta
  const project = projectStore.createProject(projectStore.selectedFolderId);
  await projectStore.addProject(project, true);
  (meta as Project)._id = generateCiteKey(meta, settingStore.projectIdRule);
  await projectStore.updateProject(project._id, meta as Project);
}

/**
 * Open export dialog for citation export
 * @param {Folder} folder - The folder which needs to be exported
 */
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
 * Exports a folder as a collection of references in a specified format.
 * @param {string} format - The citation.js supported format.
 * @param {object} options - Extra export options.
 */
async function exportFolder(
  format: string,
  folder: Folder,
  options?: { format?: string; template?: string }
) {
  await exportMeta(folder, format, options);
}
</script>
