import { defineStore } from "pinia";
import {
  FolderOrNote,
  Note,
  NoteType,
  Project,
  SpecialFolder,
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
} from "src/backend/project/note";
import {
  addProject,
  attachPDF,
  createProject,
  deleteProject,
  getProject,
  getProjects,
  renamePDF,
  updateProject,
} from "src/backend/project/project";
import { sortTree } from "src/backend/project/utils";

export const useProjectStore = defineStore("projectStore", {
  state: () => ({
    ready: false, // is project loaded
    selected: [] as (Project | Note)[], // projectIds selected by checkbox
    projects: [] as Project[], // array of projects
    openedProjects: [] as Project[], // array of opened projects

    updatedProject: {} as Project, // for updating window tab name
    selectedFolderId: SpecialFolder.LIBRARY.toString(), // selected category in library page
  }),

  actions: {
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
    async loadOpenedProjects(openedProjectIds: string[] | Set<string>) {
      this.openedProjects = [];
      let pushedIds = this.openedProjects.map((p) => p._id);
      for (let projectId of openedProjectIds) {
        if (pushedIds.includes(projectId)) continue;
        let project = (await this.getProjectFromDB(projectId)) as Project;
        sortTree(project); // sort notes by alphabet
        this.openedProjects.push(project);
        pushedIds.push(projectId);
      }
    },

    /**
     * Opens a project by loading its details from the database and adding it to the openedProjects array if not already present.
     * @param projectId - The unique identifier of the project to open.
     */
    async openProject(projectId: string) {
      let project = (await this.getProjectFromDB(projectId)) as Project;
      if (!this.openedProjects.map((p) => p._id).includes(project._id))
        this.openedProjects.push(project);
    },

    /**
     * Creates a new project in a specified folder.
     * @param folderId - The unique identifier of the folder where the project is to be created.
     * @returns A new project object.
     */
    createProject(folderId: string) {
      return createProject(folderId);
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
      this._updateProjectUI(newProject);
    },

    _updateProjectUI(newProject: Project) {
      let projectInList = this.projects.find((p) => p._id === newProject._id);
      let projectInOpened = this.openedProjects.find(
        (p) => p._id === newProject._id
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
     * @param folderId - The unique identifier of the folder whose projects are to be loaded.
     */
    async loadProjects(folderId: string) {
      this.projects = await getProjects(folderId, {
        includePDF: true,
        includeNotes: true,
      });
      this.ready = true;
    },

    /**
     * Renames the PDF file associated with a project.
     * @param projectId - The unique identifier of the project whose PDF is to be renamed.
     */
    async renamePDF(projectId: string) {
      let project = this.getProject(projectId);
      // update ui
      if (project) Object.assign(project, { path: await renamePDF(project) });
    },

    /**
     * Attaches a PDF to a project.
     * @param projectId - The unique identifier of the project to which the PDF will be attached.
     */
    async attachPDF(projectId: string) {
      // update db
      const filename = await attachPDF(projectId);
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
      this._updateProjectUI(project);
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
        this._updateProjectUI(project);
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
      this._updateProjectUI(project);
    },
  },
});
