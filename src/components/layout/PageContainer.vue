<template>
  <div
    ref="container"
    style="height: 100%"
  >
    <component
      v-for="page in pages"
      v-show="!!page.visible"
      :key="page.id"
      :is="asyncPages.get(page.type)"
      :visible="!!page.visible"
      :itemId="page.id"
      :data="page.data"
      @dragover="(ev: DragEvent) => onDragOverPage(ev, page)"
    />
    <div
      ref="mask"
      class="drop-mask"
      @dragover="(ev: DragEvent) => onDragOver(ev)"
      @dragleave="(ev: DragEvent) => onDragLeave(ev)"
      @drop="(ev: DragEvent) => onDrop(ev)"
    ></div>
    <div
      ref="highlight"
      class="drop-highlight"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { type Page } from "src/backend/database";
import { PropType, ref } from "vue";

const props = defineProps({
  pages: { type: Object as PropType<Page[]>, required: true },
  asyncPages: { type: Object as PropType<Map<string, any>>, required: true },
});
const emit = defineEmits(["moveToStack"]);

const highlight = ref<HTMLElement>();
const container = ref<HTMLElement>();
const mask = ref<HTMLElement>();

function onDragOverPage(ev: DragEvent, page: Page) {
  // do nothing when dragging the page to itself
  if (ev.dataTransfer!.types.includes(page.id) && props.pages.length === 1)
    return;
  if (mask.value) mask.value.style.display = "block";
}

function onDragLeave(ev: DragEvent) {
  if (highlight.value) highlight.value.style.display = "none";
  if (mask.value) mask.value.style.display = "none";
}

/**
 * Highlight dropping area on the dragovered page
 * @param ev
 */
function onDragOver(ev: DragEvent) {
  ev.preventDefault();

  const containerDiv = container.value;
  const highlightDiv = highlight.value;
  if (!containerDiv || !highlightDiv) return;

  console.log("X", ev.offsetX);
  console.log("width", containerDiv.clientWidth);
  // highlight left, right, top, bottom dropping area
  if (ev.offsetX < 0.3 * containerDiv.clientWidth) {
    highlightDiv.style.top = `${containerDiv.clientTop}px`;
    highlightDiv.style.left = `${containerDiv.clientLeft}px`;
    highlightDiv.style.width = `${0.5 * containerDiv.clientWidth}px`;
    highlightDiv.style.height = `${containerDiv.clientHeight}px`;
    highlightDiv.style.display = "block";
  } else if (ev.offsetX > 0.7 * containerDiv.clientWidth) {
    highlightDiv.style.top = `${containerDiv.clientTop}px`;
    highlightDiv.style.left = `${
      containerDiv.clientLeft + 0.5 * containerDiv.clientWidth
    }px`;
    highlightDiv.style.width = `${0.5 * containerDiv.clientWidth}px`;
    highlightDiv.style.height = `${containerDiv.clientHeight}px`;
    highlightDiv.style.display = "block";
  } else {
    if (ev.offsetY < 0.3 * containerDiv.clientHeight) {
      highlightDiv.style.top = `${containerDiv.clientTop}px`;
      highlightDiv.style.left = `${containerDiv.clientLeft}px`;
      highlightDiv.style.width = `${containerDiv.clientWidth}px`;
      highlightDiv.style.height = `${0.5 * containerDiv.clientHeight}px`;
      highlightDiv.style.display = "block";
    } else if (ev.offsetY > 0.7 * containerDiv.clientHeight) {
      highlightDiv.style.top = `${
        containerDiv.clientTop + 0.5 * containerDiv.clientHeight
      }px`;
      highlightDiv.style.left = `${containerDiv.clientLeft}px`;
      highlightDiv.style.width = `${containerDiv.clientWidth}px`;
      highlightDiv.style.height = `${0.5 * containerDiv.clientHeight}px`;
      highlightDiv.style.display = "block";
    } else {
      highlightDiv.style.top = `${containerDiv.clientTop}px`;
      highlightDiv.style.left = `${containerDiv.clientLeft}px`;
      highlightDiv.style.width = `${containerDiv.clientWidth}px`;
      highlightDiv.style.height = `${containerDiv.clientHeight}px`;
      highlightDiv.style.display = "block";
    }
  }
}

/**
 * Drop a page
 * @param ev
 */
function onDrop(ev: DragEvent) {
  // move page around
  const draggedPage = JSON.parse(ev.dataTransfer!.getData("page"));
  if (!draggedPage) return;

  const containerDiv = container.value;
  if (!containerDiv) return;

  if (ev.offsetX < 0.3 * containerDiv.clientWidth) {
    // drop into page left
    emit("moveToStack", draggedPage, "left");
  } else if (ev.offsetX > 0.7 * containerDiv.clientWidth) {
    // drop into page right
    emit("moveToStack", draggedPage, "right");
  } else {
    if (ev.offsetY < 0.3 * containerDiv.clientHeight) {
      // drop into page top
      emit("moveToStack", draggedPage, "top");
    } else if (ev.offsetY > 0.7 * containerDiv.clientHeight) {
      // drop into page bottom
      emit("moveToStack", draggedPage, "bottom");
    } else {
      // drop into page center
      emit("moveToStack", draggedPage, "center");
    }
  }

  // must put this to the end otherwise drop position is not correct
  onDragLeave(ev);
}
</script>
<style scoped lang="scss">
.drop-highlight {
  position: absolute;
  background: lighten($dark, 10);
  pointer-events: none;
  z-index: 90;
  transition: 100ms;
}
.drop-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 99;
  display: none;
}
</style>
