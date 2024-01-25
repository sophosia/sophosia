import { Project } from "src/backend/database";
import { reactive, ref } from "vue";

/**
 * Base "class" for dialog, has all the basic controls
 * @returns properties and control function of dialog
 */
function useDialog() {
  const visible = ref(false);
  let onConfirmCallback: () => void;

  function show() {
    visible.value = true;
  }

  function close() {
    visible.value = false;
  }

  function toggle(isVisible?: boolean) {
    if (isVisible === undefined) visible.value = !visible.value;
    else visible.value = isVisible;
  }

  function onConfirm(callback: () => void) {
    onConfirmCallback = callback;
  }

  function confirm() {
    if (onConfirmCallback === undefined)
      throw Error("Must implement onConfirmCallback");
    close();
    onConfirmCallback();
  }

  return {
    visible,
    show,
    close,
    toggle,
    onConfirm,
    confirm,
  };
}

/**
 * Controller for ImportDialog
 * @returns properties and controls
 */
function useImportDialog() {
  const dialog = useDialog();
  const isCreateFolder = ref(true);
  return {
    ...dialog,
    isCreateFolder,
  };
}

/**
 * Controller for DeleteDialog
 * @returns properties and controls
 */
function useDeleteDialog() {
  const dialog = useDialog();
  const isDeleteFromDB = ref(false);
  const deleteProjects = ref<Project[]>([]);
  return {
    ...dialog,
    isDeleteFromDB,
    deleteProjects,
  };
}

/**
 * Controller for IdentifierDialog
 * @returns properties and controls
 */
function useIdentifierDialog() {
  const dialog = useDialog();
  const identifier = ref("");
  return {
    ...dialog,
    identifier,
  };
}

/**
 * Controller for ExportDialog
 * @returns properties and controls
 */
function useExportDialog() {
  const dialog = useDialog();
  const formats = [
    { label: "Bibliography", value: "bibliography" },
    { label: "BibTeX", value: "bibtex" },
    { label: "BibLaTeX", value: "biblatex" },
    { label: "CLS-JSON", value: "json" },
    { label: "RIS", value: "ris" },
  ];
  const format = ref(formats[1]);

  const templates = [
    // { label: "APA", value: "apa" },//this is the default APA citation-js template - not needed
    { label: "APA 7th", value: "APA 7th" },
    { label: "Chicago 17th", value: "Chicago 17th" },
    { label: "IEEE", value: "IEEE" },
    { label: "MLA 9th", value: "MLA 9th" },
    { label: "Vancouver", value: "vancouver" },
    { label: "Havard1", value: "havard1" },
  ];
  const template = ref(templates[0]);

  return {
    ...dialog,
    templates,
    template,
    formats,
    format,
  };
}

/**
 * Controller for ErrorDialog
 * @returns properties and controls
 */
function useErrorDialog() {
  const dialog = useDialog();
  const error = ref(new Error());
  return {
    ...dialog,
    error,
  };
}

/**
 * Controller for ProgressDialog
 * @returns properties and controls
 */
function useProgressDialog() {
  const dialog = useDialog();
  const progress = ref(0.0);
  const errors = reactive<Error[]>([]);
  return {
    ...dialog,
    progress,
    errors,
  };
}

// use reative here so we can use properties in the composable reactively without desconstruct them
export const importDialog = reactive(useImportDialog());
export const deleteDialog = reactive(useDeleteDialog());
export const identifierDialog = reactive(useIdentifierDialog());
export const exportDialog = reactive(useExportDialog());
export const errorDialog = reactive(useErrorDialog());
export const progressDialog = reactive(useProgressDialog());
