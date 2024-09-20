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
import { sortTree } from "src/backend/utils";
import { useLayoutStore } from "./layoutStore";

export const useProjectStore = defineStore("projectStore", {
  state: () => ({
    initialized: false, // is project loaded
    showReferences: true,
    showNotebooks: true,
    selected: [] as (Project | Note)[], // projectIds selected by checkbox
    projects: [] as Project[], // array of projects
    openedProjects: [] as Project[], // array of opened projects

    updatedProject: {} as Project, // for updating window tab name
    selectedCategory: SpecialCategory.LIBRARY.toString(), // selected category in library page
    // fire after a rename of note/folder, batchReplaceLink will change contents of markdowns containing the link to old note/folder
    isNotesUpdated: false,
  }),

  actions: {
    /**
     * Given the appState, initialize the store
     * Will load the openedProjects and the projects corresponding to the selectedCategory
     * @param {AppState} state
     */
    async loadState(state: AppState) {
      if (this.initialized) return;
      this.selectedCategory = state.selectedCategory;
      await this.loadOpenedProjects(state.openedProjectIds);
      await this.loadProjects(state.selectedCategory);
      this.initialized = true;
    },

    /**
     * Output the data needs to be saved
     * @returns {AppState} The data needs to be saved
     */
    saveState(): AppState {
      const projectIds = this.openedProjects.map((project) => project._id);
      const uniqueIds = new Set(projectIds);
      return {
        openedProjectIds: [...uniqueIds],
        selectedCategory: this.selectedCategory,
      } as AppState;
    },

    /**
     * Retrieves a project from the store based on its projectId.
     * @param projectId - The unique identifier of the project.
     * @returns The project object if found, otherwise undefined.
     */
    getProject(projectId: string) {
      return this.projects.find((project) => project._id === projectId);
    },

    /**
     * Loads a project from the database including its PDF and notes, if any.
     * @param projectId - The unique identifier of the project to load.
     * @returns A project object with detailed information.
     */
    async getProjectFromDB(projectId: string) {
      return await getProject(projectId, {
        includePDF: true,
        includeNotes: true,
      });
    },

    /**
     * Loads projects identified by their IDs into the openedProjects array.
     * @param openedProjectIds - An array or set of project IDs to be loaded.
     */
    async loadOpenedProjects(openedProjectIds: string[]) {
      const openedProjects = [];
      const uniqueIds = new Set(openedProjectIds);
      for (let projectId of uniqueIds) {
        const project = (await this.getProjectFromDB(projectId)) as Project;
        sortTree(project); // sort notes by alphabet
        openedProjects.push(project);
      }
      // only change the this.openedProjects in the final step
      // this is to avoid the confusing of proxy object update
      this.openedProjects = openedProjects;
    },

    /**
     * Opens a project by loading its details from the database and adding it to the openedProjects array if not already present.
     * @param projectId - The unique identifier of the project to open.
     */
    async openProject(projectId: string) {
      console.log("opened", projectId);
      let project = (await this.getProjectFromDB(projectId)) as Project;
      if (!this.openedProjects.map((p) => p._id).includes(project._id))
        this.openedProjects.push(project);
    },

    /**
     * Creates a new project in a specified folder.
     * @param category - The unique identifier of the category where the project is to be created.
     * @returns A new project object.
     */
    createProject(category: string) {
      return createProject(category);
    },

    /**
     * Adds a project to the projects array in the store. Optionally saves the project to the database.
     * @param project - The project object to add.
     * @param saveToDB - Boolean indicating whether to save the project to the database.
     */
    async addProject(project: Project, saveToDB?: boolean) {
      if (saveToDB) project = (await addProject(project)) as Project;
      if (!this.getProject(project._id)) this.projects.push(project);
    },

    /**
     * Updates the details of a project both in the projects and openedProjects arrays.
     * @param projectId - The unique identifier of the project to update.
     * @param props - The new properties to be updated in the project.
     */
    async updateProject(projectId: string, props: Project) {
      let newProject = (await updateProject(projectId, props)) as Project;
      this._updateProjectUI(projectId, newProject);
    },

    _updateProjectUI(projectId: string, newProject: Project) {
      let projectInList = this.projects.find((p) => p._id === projectId);
      let projectInOpened = this.openedProjects.find(
        (p) => p._id === projectId
      );

      // project exists in list
      if (projectInList) Object.assign(projectInList, newProject);
      // project exists in opened project lists
      if (projectInOpened) Object.assign(projectInOpened, newProject);

      this.updatedProject = newProject;
    },

    /**
     * Deletes a project from the projects array and optionally from the database.
     * @param projectId - The unique identifier of the project to delete.
     * @param deleteFromDB - Boolean indicating whether to delete the project from the database.
     * @param folderId - Optional folder ID if the project is within a folder.
     */
    async deleteProject(
      projectId: string,
      deleteFromDB: boolean,
      folderId?: string
    ) {
      let ind = this.projects.findIndex((p) => p._id === projectId);
      if (ind > -1) {
        // update ui
        this.projects.splice(ind, 1);
        this.selected = this.selected.filter((p) => p._id === projectId);
        // update db
        await deleteProject(projectId, deleteFromDB, folderId);
      }
    },

    /**
     * Loads all projects under a specific folder from the database.
     * Filters out necessary items based on showReferences and showNotebooks
     * @param category - The unique identifier of the folder whose projects are to be loaded.
     */
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

    /**
     * Renames the PDF file associated with a project.
     * @param projectId - The unique identifier of the project whose PDF is to be renamed.
     */
    async renamePDF(projectId: string, renameRule: string) {
      // update db
      const newPath = await projectFileAGUD.renamePDF(projectId, renameRule);
      // update ui
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

    /**
     * Attaches a PDF to a project.
     * @param projectId - The unique identifier of the project to which the PDF will be attached.
     */
    async attachPDF(projectId: string) {
      // update db
      const filename = await projectFileAGUD.attachPDF(projectId);
      // update ui
      if (filename)
        await this.updateProject(projectId, { path: filename } as Project);
    },

    /**
     * Retrieves a note from the database based on its unique identifier.
     * @param noteId - The unique identifier of the note to retrieve.
     * @returns The requested note object.
     */
    async getNoteFromDB(noteId: string) {
      return await getNote(noteId);
    },

    /**
     * Creates a new folder or note under a specific parent node.
     * @param parentNodeId - The unique identifier of the parent node.
     * @param nodeType - Type of the node to create ('folder' or 'note').
     * @param noteType - The type of note to create, if the node is a note.
     * @returns The newly created node object.
     */
    async createNode(
      parentNodeId: string,
      nodeType: "folder" | "note",
      noteType: NoteType = NoteType.MARKDOWN
    ) {
      if (nodeType === "folder") return await createFolder(parentNodeId);
      else return await createNote(parentNodeId, noteType);
    },

    /**
     * Adds a folder or note to the store and database.
     * @param node - The node object (folder or note) to add.
     */
    async addNode(node: FolderOrNote) {
      // update db
      if (node.dataType === "folder") await addFolder(node);
      else await addNote(node as Note);
      // update ui
      const projectId = node._id.split("/")[0];
      const project = (await this.getProjectFromDB(projectId)) as Project;
      sortTree(project);
      this._updateProjectUI(projectId, project);
    },

    /**
     * Renames a folder or note both in the store and the database.
     * @param oldNodeId - The original unique identifier of the node.
     * @param newNodeId - The new unique identifier for the node.
     * @param nodeType - The type of the node ('folder' or 'note').
     */
    async renameNode(
      oldNodeId: string,
      newNodeId: string,
      nodeType: "folder" | "note"
    ) {
      // update db
      if (nodeType === "folder") await renameFolder(oldNodeId, newNodeId);
      else await renameNote(oldNodeId, newNodeId);
      // update ui
      const oldProjectId = oldNodeId.split("/")[0];
      const newProjectId = newNodeId.split("/")[0];
      for (const projectId of new Set([oldProjectId, newProjectId])) {
        let project = (await this.getProjectFromDB(projectId)) as Project;
        sortTree(project);
        this._updateProjectUI(projectId, project);
      }
    },

    /**
     * Deletes a folder or note from the store and database.
     * @param nodeId - The unique identifier of the node to delete.
     * @param nodeType - The type of the node ('folder' or 'note').
     */
    async deleteNode(nodeId: string, nodeType: "folder" | "note") {
      if (nodeType === "folder") await deleteFolder(nodeId);
      else await deleteNote(nodeId);
      // update ui
      const projectId = nodeId.split("/")[0];
      let project = (await this.getProjectFromDB(projectId)) as Project;
      sortTree(project);
      this._updateProjectUI(projectId, project);
    },

    /**
     * Get category tree
     *
     * @returns {Promise<CategoryNode[]>}
     */
    async getCategoryTree(): Promise<CategoryNode[]> {
      return await getCategoryTree();
    },

    /**
     * Update category and the corresponding projects
     *
     * @param {string} oldCategory
     * @param {string} newCategory
     *
     * @example
     * To rename a category (and its subcategories)
     * updateCategory(oldCategory, newCategory)
     *
     * @example
     * To move a category into another category
     * move library/category1 into library/category2
     * updateCategory("library/category1", "library/category2/category1")
     * duplicate must be check before using this function
     */
    async updateCategory(oldCategory: string, newCategory: string) {
      // updte db
      await updateCategory(oldCategory, newCategory);
      // update UI
      for (const project of this.projects) {
        project.categories = project.categories.map((category) =>
          category.replace(oldCategory, newCategory)
        );
      }
    },

    /**
     * Delete a category and its subcategories
     *
     * @param {string} category
     */
    async deleteCategory(category: string) {
      // update db
      await deleteCategory(category);
      // update UI
      for (const project of this.projects) {
        project.categories = project.categories.filter(
          (cat) => !cat.startsWith(category)
        );
      }
    },
  },
});
