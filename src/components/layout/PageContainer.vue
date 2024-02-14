<template>
  <div
    ref="container"
    style="height: 100%"
    @dragover="(ev: DragEvent) => onDragOver(ev)"
    @dragleave="(ev: DragEvent) => onDragLeave(ev)"
    @drop="(ev: DragEvent) => onDrop(ev)"
  >
    <component
      v-for="page in pages"
      :key="page.id"
      :is="asyncPages.get(page.type)"
      :visible="!!page.visible"
      :itemId="page.id"
      :data="page.data"
    />
    <div
      class="drop-highlight-center"
      ref="highlightCenter"
      @dragover="onDragEnterCenter"
      @dragleave="onDragLeaveCenter"
    ></div>
    <div
      class="drop-highlight-left"
      ref="highlightLeft"
    ></div>
    <div
      class="drop-highlight-right"
      ref="highlightRight"
    ></div>
    <div
      class="drop-highlight-top"
      ref="highlightTop"
    ></div>
    <div
      class="drop-highlight-bottom"
      ref="highlightBottom"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { throttle } from "quasar";
import { type Page } from "src/backend/database";
import { PropType, ref, watchEffect } from "vue";

const props = defineProps({
  pages: { type: Object as PropType<Page[]>, required: true },
  asyncPages: { type: Object as PropType<Map<string, any>>, required: true },
  draggedPage: { type: Object as PropType<Page> },
});
const emit = defineEmits(["moveToStack"]);

const highlight = ref("");
const highlightCenter = ref<HTMLElement>();
const highlightLeft = ref<HTMLElement>();
const highlightRight = ref<HTMLElement>();
const highlightTop = ref<HTMLElement>();
const highlightBottom = ref<HTMLElement>();
const container = ref<HTMLElement>();
const visiblePage = ref(props.pages[0]);
const visiblePageIndex = ref(0);

watchEffect(() => {
  for (const [index, page] of props.pages.entries()) {
    if (!!page.visible) {
      visiblePage.value = page;
      visiblePageIndex.value = index;
    }
  }
});

function onDragEnterCenter(ev: DragEvent) {
  console.log("enter center");
  ev.preventDefault();
  const highlightCenterDiv = highlightCenter.value;
  if (highlightCenterDiv) highlightCenterDiv.style.display = "block";
}
function onDragLeaveCenter(ev: DragEvent) {
  console.log("leave center");
  const highlightCenterDiv = highlightCenter.value;
  if (highlightCenterDiv) highlightCenterDiv.style.display = "none";
}

/**
 * Highlight dropping area on the dragovered page
 * @param ev
 */
function onDragOver(ev: DragEvent) {
  ev.preventDefault();
  // const draggedPage = JSON.parse(ev.dataTransfer!.getData("page")!) as Page;
  setHighlightStyle(ev.clientX, ev.clientY);
}

function _setHighlightStyle(clientX: number, clientY: number) {
  const draggedPage = props.draggedPage;
  const overedPage = props.pages[visiblePageIndex.value];
  // nothing to split or move if a single tab is dragged over on itself
  if (
    draggedPage &&
    draggedPage.id === overedPage.id &&
    props.pages.length === 1
  )
    return;
  const containerDiv = container.value;
  const highlightCenterDiv = highlightCenter.value;
  const highlightLeftDiv = highlightLeft.value;
  const highlightRightDiv = highlightRight.value;
  const highlightTopDiv = highlightTop.value;
  const highlightBottomDiv = highlightBottom.value;
  if (!containerDiv) return;
  if (
    !highlightCenterDiv ||
    !highlightLeftDiv ||
    !highlightRightDiv ||
    !highlightTopDiv ||
    !highlightBottomDiv
  )
    return;
  console.log("set");
  // highlight left, right, top, bottom dropping area
  // if (clientX < 0.3 * containerDiv.offsetWidth) {
  //   // highlightCenterDiv.style.display = "none";
  //   // highlightLeftDiv.style.display = "block";
  //   // highlightRightDiv.style.display = "none";
  //   // highlightTopDiv.style.display = "none";
  //   // highlightBottomDiv.style.display = "none";
  //   highlight.value = "left";
  // } else if (clientX > 0.7 * containerDiv.offsetWidth) {
  //   // highlightCenterDiv.style.display = "none";
  //   // highlightLeftDiv.style.display = "none";
  //   // highlightRightDiv.style.display = "block";
  //   // highlightTopDiv.style.display = "none";
  //   // highlightBottomDiv.style.display = "none";
  //   highlight.value = "right";
  // } else {
  //   if (clientY < 0.3 * containerDiv.offsetHeight) {
  //     // highlightCenterDiv.style.display = "none";
  //     // highlightLeftDiv.style.display = "none";
  //     // highlightRightDiv.style.display = "none";
  //     // highlightTopDiv.style.display = "block";
  //     // highlightBottomDiv.style.display = "none";
  //     highlight.value = "top";
  //   } else if (clientY > 0.7 * containerDiv.offsetHeight) {
  //     // highlightCenterDiv.style.display = "none";
  //     // highlightLeftDiv.style.display = "none";
  //     // highlightRightDiv.style.display = "none";
  //     // highlightTopDiv.style.display = "none";
  //     // highlightBottomDiv.style.display = "block";
  //     highlight.value = "bottom";
  //   } else {
  //     // highlightCenterDiv.style.display = "block";
  //     // highlightLeftDiv.style.display = "none";
  //     // highlightRightDiv.style.display = "none";
  //     // highlightTopDiv.style.display = "none";
  //     // highlightBottomDiv.style.display = "none";
  //     highlight.value = "center";
  //   }
  // }
}

const setHighlightStyle = throttle(_setHighlightStyle, 1000);

/**
 * Remove drop highlight area from the leaved page
 * @param ev
 */
function onDragLeave(ev: DragEvent) {
  console.log("leave");
  if (highlightCenter.value) highlightCenter.value.style.display = "none";
  if (highlightLeft.value) highlightLeft.value.style.display = "none";
  if (highlightRight.value) highlightRight.value.style.display = "none";
  if (highlightTop.value) highlightTop.value.style.display = "none";
  if (highlightBottom.value) highlightBottom.value.style.display = "none";
}

/**
 * Drop a page
 * @param ev
 */
function onDrop(ev: DragEvent) {
  // hide highlights
  onDragLeave(ev);

  // move page around
  // const draggedPage = JSON.parse(ev.dataTransfer!.getData("page"));
  const draggedPage = props.draggedPage;
  const droppedPage = props.pages[visiblePageIndex.value];
  if (!draggedPage || !droppedPage) return;
  // nothing to split or move if a single tab is dragged over on itself
  if (draggedPage.id === droppedPage.id && props.pages.length === 1) return;

  const containerDiv = container.value;
  if (!containerDiv) return;

  if (ev.offsetX < 0.2 * containerDiv.offsetWidth) {
    // drop into page left
    emit("moveToStack", draggedPage, "left");
  } else if (ev.offsetX > 0.8 * containerDiv.offsetWidth) {
    // drop into page right
    emit("moveToStack", draggedPage, "right");
  } else if (ev.offsetY < 0.2 * containerDiv.offsetHeight) {
    // drop into page top
    emit("moveToStack", draggedPage, "top");
  } else if (ev.offsetY > 0.8 * containerDiv.offsetHeight) {
    // drop into page bottom
    emit("moveToStack", draggedPage, "bottom");
  } else {
    // drop into page center
    emit("moveToStack", draggedPage, "center");
  }
}
</script>
<style scoped lang="scss">
.drop-highlight-center {
  position: absolute;
  width: 100%;
  height: 100%;
  background: rgba(255, 0, 0, 0.288);
  pointer-events: none;
}
.drop-highlight-left {
  position: absolute;
  width: 50%;
  height: 100%;
  background: rgba(255, 0, 0, 0.288);
  pointer-events: none;
}
.drop-highlight-right {
  position: absolute;
  left: 50%;
  width: 50%;
  height: 100%;
  background: rgba(255, 0, 0, 0.288);
  pointer-events: none;
}
.drop-highlight-top {
  position: absolute;
  width: 100%;
  height: 50%;
  background: rgba(255, 0, 0, 0.288);
  pointer-events: none;
}
.drop-highlight-bottom {
  position: absolute;
  top: 50%;
  width: 100%;
  height: 50%;
  background: rgba(255, 0, 0, 0.288);
  pointer-events: none;
}
</style>
