import { exists } from "@tauri-apps/api/fs";
import { dirname, join } from "@tauri-apps/api/path";
import { Notify } from "quasar";
import {
  ProjectNode,
  Note,
  NodeType,
  Page,
} from "src/backend/database";
import { getNotes } from "src/backend/note";
import { idToPath, oldToNewId } from "src/backend/utils";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { nextTick, ref } from "vue";
import { useI18n } from "vue-i18n";

export function useNodeActions() {
  const { t } = useI18n({ useScope: "global" });
  const layoutStore = useLayoutStore();
  const projectStore = useProjectStore();
  const pathDuplicate = ref(false);

  async function checkDuplicate(node: Note, currentLabel: string) {
    let extension: string;
    if (node.type === NodeType.EXCALIDRAW) extension = ".excalidraw";
    else if (node.type === NodeType.PAPER) extension = ".pdf";
    else extension = ".md";
    const labelWithExt = currentLabel.endsWith(extension)
      ? currentLabel
      : currentLabel + extension;
    const path = await join(
      await dirname(idToPath(node._id)),
      labelWithExt
    );

    pathDuplicate.value =
      (await exists(path)) && path !== idToPath(node._id);
  }

  async function deleteNode(
    node: ProjectNode,
    onAfterDelete?: () => void
  ) {
    if (node.dataType === "note" || node.dataType === "paper") {
      layoutStore.closePage(node._id);
    } else if (node.dataType === "folder") {
      const notes = await getNotes(node._id);
      for (const note of notes) {
        layoutStore.closePage(note._id);
      }
    }
    await projectStore.deleteNode(node._id, node.dataType);
    onAfterDelete?.();
  }

  async function renameNote(
    oldNoteId: string,
    newLabel: string,
    onSuccess: (newNoteId: string, newLabel: string) => void,
    onCancel: () => void,
    options?: { silent?: boolean }
  ) {
    if (pathDuplicate.value || !newLabel) {
      onCancel();
      return;
    }
    const newNoteId = await oldToNewId(oldNoteId, newLabel);
    const finalLabel = newNoteId.split("/").at(-1) as string;
    layoutStore.renamePage(oldNoteId, {
      id: newNoteId,
      label: finalLabel,
    } as Page);
    await nextTick();
    await projectStore.renameNode(oldNoteId, newNoteId, "note");
    onSuccess(newNoteId, finalLabel);
    if (!options?.silent) Notify.create(t("updated", { type: t("link") }));
  }

  async function renameFolder(
    oldFolderId: string,
    newLabel: string,
    onSuccess: (newFolderId: string, newLabel: string) => void,
    onCancel: () => void
  ) {
    if (pathDuplicate.value || !newLabel) {
      onCancel();
      return;
    }
    const newFolderId = await oldToNewId(oldFolderId, newLabel);
    const finalLabel = newFolderId.split("/").at(-1) as string;
    await projectStore.renameNode(oldFolderId, newFolderId, "folder");
    onSuccess(newFolderId, finalLabel);
    Notify.create(t("updated", { type: t("link") }));
  }

  return {
    pathDuplicate,
    checkDuplicate,
    deleteNode,
    renameNote,
    renameFolder,
  };
}
