import { Project } from "src/backend/database";
import { ref } from "vue";

class Dialog {
  private _visible = ref(false);
  private onConfirmCallback: (() => void) | null = null;

  get visible() {
    return this._visible.value;
  }

  set visible(isVisible: boolean) {
    this._visible.value = isVisible;
  }

  show() {
    this.visible = true;
  }

  close() {
    this.visible = false;
  }

  toggle(isVisible?: boolean) {
    if (isVisible === undefined) this.visible = !this.visible;
    else this.visible = isVisible;
  }

  onConfirm(callback: () => void) {
    this.onConfirmCallback = callback;
  }

  confirm() {
    if (this.onConfirmCallback === null)
      throw Error("must implement onConfirm");
    this.close();
    this.onConfirmCallback();
  }
}

class ImportDialog extends Dialog {
  private _isCreateFolder = ref(true);

  get isCreateFolder() {
    return this._isCreateFolder.value;
  }

  set isCreateFolder(create: boolean) {
    this._isCreateFolder.value = create;
  }
}

class DeleteDialog extends Dialog {
  private _isDeleteFromDB = ref(false);
  private _deleteProjects = ref<Project[]>([]);

  get isDeleteFromDB() {
    return this._isDeleteFromDB.value;
  }

  set isDeleteFromDB(isDelete: boolean) {
    this._isDeleteFromDB.value = isDelete;
  }

  get deleteProjects() {
    return this._deleteProjects.value;
  }

  set deleteProjects(projects: Project[]) {
    this._deleteProjects.value = projects;
  }
}

export const importDialog = new ImportDialog();
export const deleteDialog = new DeleteDialog();
