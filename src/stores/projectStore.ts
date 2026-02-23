import { basename } from "@tauri-apps/api/path";
import { defineStore } from "pinia";
import {
  AppState,
  CategoryNode,
  FolderOrNote,
  Note,
  NoteType,
  PageType,
  Project,
  SpecialCategory,
} from "src/backend/database";
import {
  addFolder,
  addNote,
  createFolder,
  createNote,
  deleteFolder,
  deleteNote,
  getNote,
  renameFolder,
  renameNote,
} from "src/backend/note";
import {
  addProject,
  createProject,
  deleteProject,
  extractPDFContent,
  getProject,
  getProjects,
  updateProject,
} from "src/backend/project";
import {
  deleteCategory,
  getCategoryTree,
  updateCategory,
} from "src/backend/category";
import { projectFileAGUD } from "src/backend/project/fileOps";
import { idToPath, sortTree } from "src/backend/utils";
import { useLayoutStore } from "./layoutStore";
import { generateCiteKey, getMetaFromFile } from "src/backend/meta";
import { useSettingStore } from "./settingStore";

/**
 * If a project has an attached PDF, inject a synthetic child node
 * so the sidebar tree shows the PDF under the project.
 */
async function injectPDFChild(project: Project) {
  if (!project.path) return;
  const pdfLabel = await basename(project.path);
  if (project.children?.some((c) => c.label === pdfLabel)) return;
  if (!project.children) project.children = [];
  project.children.unshift({
    _id: `${project._id}/${pdfLabel}`,
    label: pdfLabel,
    dataType: "note",
  } as FolderOrNote);
}

/**
 * Fetch a project from DB with PDF + notes, inject PDF child, and sort.
 */
async function fetchAndPrepareProject(projectId: string): Promise<Project> {
  const project = (await getProject(projectId, {
    includePDF: true,
    includeNotes: true,
  })) as Project;
  await injectPDFChild(project);
  sortTree(project);
  return project;
}

export const useProjectStore = defineStore("projectStore", {
  state: () => ({
    initialized: false,
    showReferences: true,
    showNotebooks: true,
    selected: [] as (Project | Note)[],
    projects: [] as Project[], // library view (filtered by category)
    openedProjects: [] as Project[], // sidebar + tabs (only explicitly opened)

    updatedProject: {} as Project,
    selectedCategory: SpecialCategory.LIBRARY.toString(),
    isNotesUpdated: false,
  }),

  actions: {
    async loadState(state: AppState) {
      if (this.initialized) return;
      this.selectedCategory = state.selectedCategory;
      await this.loadOpenedProjects(state.openedProjectIds);
      await this.loadProjects(state.selectedCategory);
      this.initialized = true;
    },

    saveState(): AppState {
      const uniqueIds = new Set(this.openedProjects.map((p) => p._id));
      return {
        openedProjectIds: [...uniqueIds],
        selectedCategory: this.selectedCategory,
      } as AppState;
    },

    getProject(projectId: string) {
      return this.projects.find((project) => project._id === projectId);
    },

    async getProjectFromDB(projectId: string) {
      return await getProject(projectId, {
        includePDF: true,
        includeNotes: true,
      });
    },

    async loadOpenedProjects(openedProjectIds: string[]) {
      const openedProjects = [];
      for (const projectId of new Set(openedProjectIds)) {
        openedProjects.push(await fetchAndPrepareProject(projectId));
      }
      this.openedProjects = openedProjects;
    },

    async openProject(projectId: string) {
      if (this.openedProjects.some((p) => p._id === projectId)) return;
      const project = await fetchAndPrepareProject(projectId);
      this.openedProjects.push(project);
    },

    closeProject(projectId: string) {
      const idx = this.openedProjects.findIndex((p) => p._id === projectId);
      if (idx > -1) this.openedProjects.splice(idx, 1);
    },

    createProject(category: string) {
      return createProject(category);
    },

    async addProject(project: Project, saveToDB?: boolean) {
      if (saveToDB) project = (await addProject(project)) as Project;
      if (!this.getProject(project._id)) this.projects.push(project);
    },

    async updateProject(projectId: string, props: Project) {
      const newProject = (await updateProject(projectId, props)) as Project;
      await this._updateProjectUI(projectId, newProject);
    },

    async _updateProjectUI(projectId: string, newProject: Project) {
      await injectPDFChild(newProject);

      for (const list of [this.projects, this.openedProjects]) {
        const existing = list.find((p) => p._id === projectId);
        if (existing) Object.assign(existing, newProject);
      }

      this.updatedProject = newProject;
    },

    async deleteProject(
      projectId: string,
      deleteFromDB: boolean,
      folderId?: string
    ) {
      this.projects = this.projects.filter((p) => p._id !== projectId);
      this.selected = this.selected.filter((p) => p._id !== projectId);
      this.closeProject(projectId);
      if (deleteFromDB) await deleteProject(projectId, deleteFromDB, folderId);
    },

    async loadProjects(category: string) {
      this.projects = await getProjects(category, {
        includePDF: true,
        includeNotes: true,
      });
      this.projects = this.projects.filter((project) => {
        if (this.showReferences && this.showNotebooks) return true;
        else if (!this.showReferences && this.showNotebooks)
          return project.type === "notebook";
        else if (this.showReferences && !this.showNotebooks)
          return project.type !== "notebook";
        else return false;
      });
    },

    async renamePDF(projectId: string, renameRule: string) {
      const newPath = await projectFileAGUD.renamePDF(projectId, renameRule);
      let project = this.getProject(projectId);
      if (!project) return;
      Object.assign(project, { path: newPath });
      if (!newPath) return;
      const layoutStore = useLayoutStore();
      layoutStore.renamePage(project._id, {
        id: project._id,
        type: PageType.ReaderPage,
        label: await basename(newPath),
      });
    },

    async attachPDF(projectId: string) {
      const filename = await projectFileAGUD.attachPDF(projectId);
      const filePath = idToPath(`${projectId}/${filename}`);
      const settingStore = useSettingStore();
      getMetaFromFile(filePath).then(async (meta) => {
        let newProjectId = projectId;
        if (meta) {
          meta["citation-key"] = generateCiteKey(
            meta,
            settingStore.citeKeyRule
          );
          (meta as Project)._id = generateCiteKey(
            meta,
            settingStore.projectIdRule
          );
          await this.updateProject(projectId, meta as Project);
          newProjectId = (meta as Project)._id;
        }
        await extractPDFContent((await projectFileAGUD.getPDF(newProjectId))!);
      });

      if (filename) {
        const project = await fetchAndPrepareProject(projectId);
        project.path = filename;
        await this._updateProjectUI(projectId, project);
      }
    },

    async getNoteFromDB(noteId: string) {
      return await getNote(noteId);
    },

    async createNode(
      parentNodeId: string,
      nodeType: "folder" | "note",
      noteType: NoteType = NoteType.MARKDOWN
    ) {
      if (nodeType === "folder") return await createFolder(parentNodeId);
      else return await createNote(parentNodeId, noteType);
    },

    async addNode(node: FolderOrNote) {
      if (node.dataType === "folder") await addFolder(node);
      else await addNote(node as Note);
      const projectId = node._id.split("/")[0];
      const project = await fetchAndPrepareProject(projectId);
      await this._updateProjectUI(projectId, project);
    },

    async renameNode(
      oldNodeId: string,
      newNodeId: string,
      nodeType: "folder" | "note"
    ) {
      if (nodeType === "folder") await renameFolder(oldNodeId, newNodeId);
      else await renameNote(oldNodeId, newNodeId);
      for (const projectId of new Set([
        oldNodeId.split("/")[0],
        newNodeId.split("/")[0],
      ])) {
        const project = await fetchAndPrepareProject(projectId);
        await this._updateProjectUI(projectId, project);
      }
    },

    async deleteNode(nodeId: string, nodeType: "folder" | "note") {
      if (nodeType === "folder") await deleteFolder(nodeId);
      else await deleteNote(nodeId);
      const projectId = nodeId.split("/")[0];
      const project = await fetchAndPrepareProject(projectId);
      await this._updateProjectUI(projectId, project);
    },

    async getCategoryTree(): Promise<CategoryNode[]> {
      return await getCategoryTree();
    },

    async updateCategory(oldCategory: string, newCategory: string) {
      await updateCategory(oldCategory, newCategory);
      for (const project of this.projects) {
        project.categories = project.categories.map((category) =>
          category.replace(oldCategory, newCategory)
        );
      }
    },

    async deleteCategory(category: string) {
      await deleteCategory(category);
      for (const project of this.projects) {
        project.categories = project.categories.filter(
          (cat) => !cat.startsWith(category)
        );
      }
    },
  },
});
