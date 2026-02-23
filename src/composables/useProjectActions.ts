import { invoke } from "@tauri-apps/api";
import { copyToClipboard, useQuasar } from "quasar";
import {
  ProjectNode,
  Page,
  PageType,
  Project,
} from "src/backend/database";
import { formatMetaData, generateCiteKey } from "src/backend/meta";
import { getDataType, idToPath } from "src/backend/utils";
import {
  exportDialog,
  nameDialog,
} from "src/components/dialogs/dialogController";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import { useI18n } from "vue-i18n";

export function useProjectActions() {
  const $q = useQuasar();
  const { t } = useI18n({ useScope: "global" });
  const layoutStore = useLayoutStore();
  const projectStore = useProjectStore();
  const settingStore = useSettingStore();

  async function showExportCitationDialog(project: Project) {
    exportDialog.show();
    exportDialog.onConfirm(async () => {
      const format = exportDialog.format.value;
      const options = { template: exportDialog.template.value };
      const meta = await formatMetaData([project], format, options);
      await copyToClipboard(meta as string);
      $q.notify(t("text-copied"));
    });
  }

  async function showInExplorer(node: Project | ProjectNode) {
    const path = idToPath(node._id);
    await invoke("show_in_folder", { path });
  }

  function showInNewWindow(node: Project | ProjectNode) {
    const page = { id: node._id, label: node.label } as Page;
    const dataType = getDataType(node._id);
    if (dataType === "paper") {
      page.type = PageType.ReaderPage;
    } else if (dataType === "note" && node._id.endsWith(".md")) {
      page.type = PageType.NotePage;
    } else if (dataType === "note" && node._id.endsWith(".excalidraw")) {
      page.type = PageType.ExcalidrawPage;
    } else {
      page.type = PageType.ReaderPage;
    }
    layoutStore.showInNewWindow(page);
  }

  function copyId(id: string) {
    copyToClipboard(id);
    $q.notify(t("text-copied"));
  }

  function copyAsProjectLink(node: Project) {
    const citeKey = generateCiteKey(node, settingStore.citeKeyRule);
    copyToClipboard(
      `[${citeKey}](sophosia://open-item/${node._id})`
    );
    $q.notify(t("text-copied"));
  }

  function copyAsNoteLink(node: ProjectNode) {
    copyToClipboard(`[${node._id}](${node._id})`);
    $q.notify(t("text-copied"));
  }

  function createProject(
    getCategory: () => string,
    getDuplicateCheck: () => (name: string) => boolean,
    options?: { title?: string; placeholder?: string }
  ) {
    const title = options?.title || t("new", { type: t("project") });
    const placeholder = options?.placeholder || title;
    nameDialog.showWithOptions({
      title,
      placeholder,
      validate: getDuplicateCheck(),
    });
    nameDialog.onConfirm(async () => {
      const project = projectStore.createProject(getCategory());
      project.label = nameDialog.name;
      project.title = nameDialog.name;
      projectStore.addProject(project, true);
    });
  }

  return {
    showExportCitationDialog,
    showInExplorer,
    showInNewWindow,
    copyId,
    copyAsProjectLink,
    copyAsNoteLink,
    createProject,
  };
}
