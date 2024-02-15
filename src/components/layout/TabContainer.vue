<template>
  <div>
    <Tab
      v-for="[index, page] in pages.entries()"
      :key="index"
      :page="page"
      :active="layoutStore.currentItemId === page.id"
      @mousedown="onMouseDown(page)"
      @close="onClose(page)"
      draggable="true"
      @dragstart="(ev: DragEvent) => onDragStartTab(ev, index)"
      @dragover="(ev: DragEvent) => onDragOverTab(ev, index)"
      @dragleave="(ev: DragEvent) => onDragLeaveTab(ev, index)"
      @drop="(ev: DragEvent) => onDropTab(ev, index)"
      ref="tabs"
    >
    </Tab>
    <!-- trailing tab header for dropping tabs into the header -->
    <div
      style="width: 100%; height: 100%"
      @dragover="(ev) => onDragOverTabContainer(ev)"
      @dragleave="(ev) => onDragLeaveTabContainer(ev)"
      @drop="(ev) => onDropTabContainer(ev)"
      ref="container"
    ></div>
  </div>
</template>
<script setup lang="ts">
import type { Page } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, ref } from "vue";
import Tab from "./Tab.vue";
const layoutStore = useLayoutStore();
const props = defineProps({
  pages: { type: Object as PropType<Page[]>, required: true },
});
const emit = defineEmits(["movePage"]);
const container = ref<HTMLElement>();
const tabs = ref<(typeof Tab)[]>([]);
const draggedPageRef = ref<Page>();

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
  layoutStore.setActive(draggedPageRef.value.id);
}

function onDragOverTab(ev: DragEvent, overedPageIndex: number) {
  ev.preventDefault();
  const overedPage = props.pages[overedPageIndex];
  if (draggedPageRef.value && overedPage.id === draggedPageRef.value.id) return;
  tabs.value[overedPageIndex].$el.classList.add("tab-drag-highlight");
}

function onDragLeaveTab(ev: DragEvent, leavedPageIndex: number) {
  tabs.value[leavedPageIndex].$el.classList.remove("tab-drag-highlight");
}

function onDropTab(ev: DragEvent, droppedPageIndex: number) {
  ev.preventDefault();
  draggedPageRef.value = undefined;
  tabs.value[droppedPageIndex].$el.classList.remove("tab-drag-highlight");
  // getData is accessible in drop event
  const draggedPage = JSON.parse(ev.dataTransfer!.getData("page"));
  const droppedPage = props.pages[droppedPageIndex];
  if (!draggedPage || !droppedPage) return;
  if (droppedPage.id === draggedPage.id) return;

  const draggedPageIndex = props.pages.findIndex(
    (comp) => comp.id === draggedPage!.id
  );

  if (draggedPageIndex > -1) {
    // if tab is dropped in the same header, move it
    if (draggedPageIndex > droppedPageIndex) {
      // insert before dropped page
      emit("movePage", draggedPage, droppedPage.id, "before");
    } else {
      // insert after dropped page
      emit("movePage", draggedPage, droppedPage.id, "after");
    }
  } else {
    // if tab is dropped in another header, insert it before the dropped Page
    emit("movePage", draggedPage, droppedPage.id, "before");
  }
}

function onDragOverTabContainer(ev: DragEvent) {
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
  if (!draggedPage) return;
  const lastPageId = props.pages[props.pages.length - 1].id;
  // nothing to do if dragging the last tab in the header
  if (draggedPage.id === lastPageId) return;
  emit("movePage", draggedPage, lastPageId, "after");
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
