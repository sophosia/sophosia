<template>
  <div style="overflow-x: auto; overflow-y: hidden">
    <Tab
      v-for="[index, page] in pages.entries()"
      :key="index"
      :page="page"
      :active="layoutStore.currentItemId === page.id"
      @mousedown.left="onMouseDown(page)"
      @close="onClose(page)"
      draggable="true"
      @dragstart="(ev: DragEvent) => onDragStartTab(ev, index)"
      @dragover="(ev: DragEvent) => onDragOverTab(ev, index)"
      @dragleave="(ev: DragEvent) => onDragLeaveTab(ev, index)"
      @drop="(ev: DragEvent) => onDropTab(ev, index)"
      ref="tabs"
    >
      <template #menu>
        <q-menu
          touch-position
          context-menu
        >
          <q-list dense>
            <div
              v-if="
                page.type === PageType.ReaderPage ||
                page.type === PageType.NotePage ||
                page.type === PageType.ExcalidrawPage
              "
            >
              <q-item
                clickable
                v-close-popup
                dense
                @click="copyId(page)"
              >
                <q-item-section>
                  <i18n-t keypath="copy-id">
                    <template #type>{{ $t("project") }}</template>
                  </i18n-t>
                </q-item-section>
              </q-item>
              <q-item
                clickable
                v-close-popup
                dense
                @click="copyAsLink(page)"
              >
                <q-item-section>
                  <i18n-t keypath="copy-as-link">
                    <template #type>{{ $t("project") }}</template>
                  </i18n-t>
                </q-item-section>
              </q-item>
              <q-separator></q-separator>
              <q-item
                clickable
                v-close-popup
                dense
                @click="showInExplorer(page)"
              >
                <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
              </q-item>
            </div>
            <q-separator></q-separator>
            <q-item
              v-if="page.id !== 'library'"
              clickable
              v-close-popup
              dense
              @click="layoutStore.showInNewWindow(page)"
            >
              <q-item-section>
                {{ $t("open-page-in-new-window") }}
              </q-item-section>
            </q-item>
            <q-item
              clickable
              v-close-popup
              dense
              @click="layoutStore.closePage(page.id)"
            >
              <q-item-section>{{ $t("close") }}</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </template>
    </Tab>
    <!-- trailing tab header for dropping tabs + window drag region -->
    <div
      style="width: 100%; height: 100%"
      data-tauri-drag-region
      @dragover="(ev) => onDragOverTabContainer(ev)"
      @dragleave="(ev) => onDragLeaveTabContainer(ev)"
      @drop="(ev) => onDropTabContainer(ev)"
      ref="container"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { invoke } from "@tauri-apps/api";
import { copyToClipboard, useQuasar } from "quasar";
import { PageType, type Page, type Project } from "src/backend/database";
import { generateCiteKey } from "src/backend/meta";
import { getProject } from "src/backend/project";
import { getDataType, idToPath } from "src/backend/utils";
import { useLayoutStore } from "src/stores/layoutStore";
import { useSettingStore } from "src/stores/settingStore";
import { PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import Tab from "./Tab.vue";
const { t } = useI18n({ useScope: "global" });
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();

const props = defineProps({
  pages: { type: Object as PropType<Page[]>, required: true },
  enableCrossWindowDragAndDrop: { type: Boolean, required: true },
});
const emit = defineEmits(["movePage"]);
const container = ref<HTMLElement>();
const tabs = ref<(typeof Tab)[]>([]);
const draggedPageRef = ref<Page>();
const $q = useQuasar();

/**
 * As soon as mouse down, set the clicked page to active
 * @param page - page to be active
 */
function onMouseDown(page: Page) {
  layoutStore.setActive(page.id);
}

function onClose(page: Page) {
  layoutStore.closePage(page.id);
}

function onDragStartTab(ev: DragEvent, draggedPageIndex: number) {
  draggedPageRef.value = props.pages[draggedPageIndex];
  ev.dataTransfer!.setData("page", JSON.stringify(draggedPageRef.value));
  // put the page id into the key
  // so we can still see it in dragover events
  ev.dataTransfer!.setData(`${props.pages[draggedPageIndex].id}`, "");
  ev.dataTransfer!.setData("windowId", layoutStore.windowId);
  layoutStore.setActive(draggedPageRef.value.id);
}

function onDragOverTab(ev: DragEvent, overedPageIndex: number) {
  if (!props.enableCrossWindowDragAndDrop && layoutStore.windowId !== "main")
    return;
  ev.preventDefault();
  const overedPage = props.pages[overedPageIndex];
  if (draggedPageRef.value && overedPage.id === draggedPageRef.value.id) return;
  tabs.value[overedPageIndex].$el.classList.add("tab-drag-highlight");
}

function onDragLeaveTab(ev: DragEvent, leavedPageIndex: number) {
  tabs.value[leavedPageIndex].$el.classList.remove("tab-drag-highlight");
}

function onDropTab(ev: DragEvent, droppedPageIndex: number) {
  draggedPageRef.value = undefined;
  tabs.value[droppedPageIndex].$el.classList.remove("tab-drag-highlight");
  // getData is accessible in drop event
  const fromWindowId = ev.dataTransfer!.getData("windowId");
  const draggedPage = JSON.parse(ev.dataTransfer!.getData("page"));
  const droppedPage = props.pages[droppedPageIndex];
  // TODO: allow library page to be on other windows.
  // we can transmit data back to main window
  if (!draggedPage || !droppedPage || !fromWindowId) return;
  if (droppedPage.id === draggedPage.id) return;
  if (layoutStore.windowId !== "main" && draggedPage.id === "library") return;

  const draggedPageIndex = props.pages.findIndex(
    (comp) => comp.id === draggedPage!.id
  );

  if (draggedPageIndex > -1) {
    // if tab is dropped in the same header, move it
    if (draggedPageIndex > droppedPageIndex) {
      // insert before dropped page
      emit("movePage", draggedPage, droppedPage.id, "before", fromWindowId);
    } else {
      // insert after dropped page
      emit("movePage", draggedPage, droppedPage.id, "after", fromWindowId);
    }
  } else {
    // if tab is dropped in another header, insert it before the dropped Page
    emit("movePage", draggedPage, droppedPage.id, "before", fromWindowId);
  }
}

function onDragOverTabContainer(ev: DragEvent) {
  if (!props.enableCrossWindowDragAndDrop && layoutStore.windowId !== "main")
    return;
  ev.preventDefault();
  if (!container.value) return;
  const lastPageId = props.pages[props.pages.length - 1].id;
  // nothing to do if dragging the last tab in the header
  if (draggedPageRef.value && draggedPageRef.value.id === lastPageId) return;
  container.value.classList.add("tab-drag-highlight");
}

function onDragLeaveTabContainer(ev: DragEvent) {
  if (!container.value) return;
  container.value.classList.remove("tab-drag-highlight");
}

function onDropTabContainer(ev: DragEvent) {
  onDragLeaveTabContainer(ev);
  draggedPageRef.value = undefined;
  const draggedPage = JSON.parse(ev.dataTransfer!.getData("page"));
  const fromWindowId = ev.dataTransfer!.getData("windowId");
  if (!draggedPage) return;
  const lastPageId = props.pages[props.pages.length - 1].id;
  // nothing to do if dragging the last tab in the header
  if (draggedPage.id === lastPageId) return;
  // TODO: allow library page to be on other windows.
  // we can transmit data back to main window
  if (layoutStore.windowId !== "main" && draggedPage.id === "library") return;
  emit("movePage", draggedPage, lastPageId, "after", fromWindowId);
}

async function showInExplorer(page: Page) {
  const path = idToPath(page.id);
  await invoke("show_in_folder", {
    path: path,
  });
}

function copyId(page: Page) {
  $q.notify(t("text-copied"));
  copyToClipboard(page.id);
}

async function copyAsLink(page: Page) {
  $q.notify(t("text-copied"));
  const dataType = getDataType(page.id);
  if (dataType === "note") {
    copyToClipboard(`[${page.id}](${page.id})`);
  } else {
    const project = (await getProject(page.id)) as Project;
    copyToClipboard(
      `[${generateCiteKey(
        project,
        settingStore.citeKeyRule
      )}](sophosia://open-item/${page.id})`
    );
  }
}
</script>
<style scoped lang="scss">
.tab-drag-highlight {
  background: var(--color-layout-focused-tab-bkgd);
}
.tab-dragging {
  pointer-events: none;
}
</style>
