<template>
  <div class="project-browser">
    <CategoryTabs ref="categoryTabs" />
    <ActionBar
      class="project-action-bar"
      v-model:searchMode="searchMode"
      v-model:searchString="searchString"
      v-model:showReferences="projectStore.showReferences"
      v-model:showNotebooks="projectStore.showNotebooks"
      @addEmptyProject="addEmptyProject"
      @addNotebook="addNotebook"
      @addByFiles="(filePaths) => addProjectsByFiles(filePaths)"
      @addByCollection="(collectionPath) => showImportDialog(collectionPath)"
      @showIdentifierDialog="showIdentifierDialog()"
      ref="actionBar"
    />
    <ProjectTable
      v-model:projects="projectStore.projects"
      :searchMode="searchMode"
      :searchString="searchString"
      class="project-browser-table"
      ref="table"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
// types
import { Project } from "src/backend/database";
// components
import ActionBar from "src/components/library/ActionBar.vue";
import CategoryTabs from "src/components/library/CategoryTabs.vue";
import ProjectTable from "src/components/library/ProjectTable.vue";
// db
import { basename, extname } from "@tauri-apps/api/path";
import {
  generateCiteKey,
  getMeta,
  getMetaFromFile,
  importMeta,
} from "src/backend/meta";
import { projectFileAGUD } from "src/backend/project/fileOps";
import { idToPath } from "src/backend/utils";
import {
  identifierDialog,
  importDialog,
} from "src/components/dialogs/dialogController";
import { useProjectActions } from "src/composables/useProjectActions";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import { extractPDFContent } from "src/backend/project";
import { useI18n } from "vue-i18n";

const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();
const { t } = useI18n({ useScope: "global" });
const { createProject } = useProjectActions();

/*********************************
 * Data
 *********************************/
// component refs
const categoryTabs = ref<typeof CategoryTabs | null>(null);

// data
const searchString = ref("");
const searchMode = ref<"meta" | "content">("meta");

watch(
  () => [
    projectStore.selectedCategory,
    projectStore.showNotebooks,
    projectStore.showReferences,
  ],
  async () => {
    projectStore.selected = [];
    projectStore.loadProjects(projectStore.selectedCategory);
  },
  { deep: true }
);

onMounted(async () => {
  projectStore.loadProjects(projectStore.selectedCategory);
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

function addEmptyProject() {
  createProject(
    () => projectStore.selectedCategory,
    () => (name: string) =>
      projectStore.projects.some(
        (p) => p.label.toLowerCase() === name.toLowerCase()
      )
  );
}

function addNotebook() {
  createProject(
    () => projectStore.selectedCategory,
    () => (name: string) =>
      projectStore.projects.some(
        (p) => p.label.toLowerCase() === name.toLowerCase()
      ),
    {
      title: t("new", { type: t("notebook") }),
      placeholder: t("new", { type: t("notebook") }),
    }
  );
}

/**
 * Adds projects by importing files from specified file paths.
 * @param {string[]} filePaths - The paths of the files to import as projects.
 */
async function addProjectsByFiles(filePaths: string[]) {
  for (let filePath of filePaths) {
    try {
      let project = projectStore.createProject(projectStore.selectedCategory);
      await projectStore.addProject(project, true);
      let filename = (await projectFileAGUD.copyFileToProjectFolder(
        filePath,
        project._id
      )) as string;
      let title = await basename(filename, ".pdf");
      const fullPath = idToPath(`${project._id}/${filename}`);
      await projectStore.updateProject(project._id, {
        pdfs: [{ name: filename, path: fullPath }],
        title: title,
      } as Project);
      // do not use await since this task takes time
      getMetaFromFile(filePath).then(async (meta) => {
        // FIXME: when meta is undefined, we can trigger the extract pdf content
        if (meta) {
          meta["citation-key"] = generateCiteKey(
            meta,
            settingStore.citeKeyRule
          );
          (meta as Project)._id = generateCiteKey(
            meta,
            settingStore.projectIdRule
          );
          await projectStore.updateProject(project._id, meta as Project);
        }
        const pdfs = await projectFileAGUD.getPDFs(project._id);
        if (pdfs.length > 0) await extractPDFContent(pdfs[0].path);
      });
    } catch (error) {
      console.log(error);
    }
  }
}

/**
 * Adds projects by importing projects from a collection file (.bib, ris, etc...)
 * @param {boolean} isCreateCategory - Indicates whether to create a new category.
 */
async function addProjectsByCollection(
  collectionPath: string,
  isCreateCategory: boolean
) {
  if (collectionPath === "") return;
  if (isCreateCategory) {
    let categoryLabel = await basename(
      collectionPath,
      `.${await extname(collectionPath)}`
    );
    projectStore.selectedCategory = `library/${categoryLabel}`;
  }

  await nextTick();

  let metas = await importMeta(collectionPath);
  for (let meta of metas) {
    let project = projectStore.createProject(projectStore.selectedCategory);
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
  const project = projectStore.createProject(projectStore.selectedCategory);
  await projectStore.addProject(project, true);
  (meta as Project)._id = generateCiteKey(meta, settingStore.projectIdRule);
  await projectStore.updateProject(project._id, meta as Project);
}

</script>
<style lang="scss" scoped>
.project-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-action-bar {
  flex-shrink: 0;
  padding: 0 8px;
  height: 36px;
}

.project-browser-table {
  flex: 1;
  width: 100%;
  background: var(--color-library-tableview-bkgd);
  overflow: hidden;
}
</style>
