import { Project } from "src/backend/database";
import { reactive, ref } from "vue";

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

class IdentifierDialog extends Dialog {
  private _identifier = ref("");

  get identifier() {
    return this._identifier.value;
  }

  set identifier(id: string) {
    this._identifier.value = id;
  }
}

class ExportDialog extends Dialog {
  formats = reactive([
    { label: "Bibliography", value: "bibliography" },
    { label: "BibTeX", value: "bibtex" },
    { label: "BibLaTeX", value: "biblatex" },
    { label: "CLS-JSON", value: "json" },
    { label: "RIS", value: "ris" },
  ]);
  format = this.formats[1];

  templates = reactive([
    // { label: "APA", value: "apa" },//this is the default APA citation-js template - not needed
    { label: "APA 7th", value: "APA 7th" },
    { label: "Chicago 17th", value: "Chicago 17th" },
    { label: "IEEE", value: "IEEE" },
    { label: "MLA 9th", value: "MLA 9th" },
    { label: "Vancouver", value: "vancouver" },
    { label: "Havard1", value: "havard1" },
  ]);
  template = this.templates[0];
}

export const importDialog = new ImportDialog();
export const deleteDialog = new DeleteDialog();
export const identifierDialog = new IdentifierDialog();
export const exportDialog = new ExportDialog();
