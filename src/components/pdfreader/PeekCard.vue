<template>
  <q-card
    square
    bordered
    flat
    ref="card"
    class="peekCard"
  >
    <q-card-section
      style="background: var(--color-pdfreader-toolbar-bkgd)"
      class="q-py-none"
    >
      <div
        style="cursor: move"
        class="row justify-between q-py-xs"
      >
        <span>{{ props.link.id }}</span>
        <div>
          <q-btn
            unelevated
            square
            dense
            size="md"
            icon="mdi-magnify-plus-outline"
            :ripple="false"
            @mousedown="
              () => {
                pinned = true;
                zoom(0.1);
              }
            "
          ></q-btn>
          <q-btn
            unelevated
            square
            dense
            size="md"
            icon="mdi-magnify-minus-outline"
            :ripple="false"
            @mousedown="
              () => {
                pinned = true;
                zoom(-0.1);
              }
            "
          ></q-btn>
          <q-checkbox
            dense
            unelevated
            square
            size="md"
            :ripple="false"
            :class="{ 'rotate-45': !pinned }"
            unchecked-icon="mdi-pin"
            checked-icon="mdi-pin"
            v-model="pinned"
          />
          <q-btn
            dense
            unelevated
            square
            size="md"
            padding="none"
            :ripple="false"
            icon="mdi-close"
            @click="close(true)"
          />
        </div>
      </div>
    </q-card-section>
    <q-card-section style="height: calc(100% - 32px - 1rem)">
      <div
        class="peekContainer"
        ref="peekContainer"
      >
        <div class="pdfViewer"></div>
      </div>
    </q-card-section>
    <q-icon
      style="cursor: se-resize; right: 0px; bottom: 0px; position: absolute"
      size="1.5rem"
      name="mdi-resize-bottom-right"
      @mousedown="
        (e:MouseEvent) => {
          pinned = true;
          resizeCard(e);
        }
      "
    ></q-icon>
  </q-card>
</template>
<script setup lang="ts">
import { onMounted, ref, PropType, watchEffect } from "vue";

import * as pdfjsLib from "pdfjs-dist";
import * as pdfjsViewer from "pdfjs-dist/web/pdf_viewer";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

import { GrabToPan } from "src/backend/pdfreader/grabToPan";
import { PeekManager } from "src/backend/pdfreader/peekManager";

const props = defineProps({
  link: { type: HTMLAnchorElement, required: true },
  peekManager: { type: Object as PropType<PeekManager>, required: true },
  darkMode: { type: Boolean, required: true },
});
const card = ref();
const peekContainer = ref();
const pinned = ref(false);
let pdfSinglePageViewer: pdfjsViewer.PDFSinglePageViewer;

watchEffect(() => {
  setViewMode(props.darkMode);
});

onMounted(() => {
  if (!peekContainer.value || !props.peekManager.pdfDocument) return;

  // init viewer
  const eventBus = new pdfjsViewer.EventBus();
  const pdfLinkService = new pdfjsViewer.PDFLinkService({
    eventBus,
  });
  pdfSinglePageViewer = new pdfjsViewer.PDFSinglePageViewer({
    container: peekContainer.value,
    eventBus: eventBus,
    linkService: pdfLinkService,
    textLayerMode: 0, // DISABLE: 0, ENABLE: 1
    annotationMode: pdfjsLib.AnnotationMode.DISABLE,
    l10n: pdfjsViewer.NullL10n,
  });
  pdfLinkService.setViewer(pdfSinglePageViewer);

  pdfLinkService.setDocument(props.peekManager.pdfDocument, null);
  pdfSinglePageViewer.setDocument(props.peekManager.pdfDocument);

  // set link
  pdfLinkService.setHash(props.link.href.split("#")[1]);

  // set pos
  // internal link is wrapped by an <section> tag
  // this section tag has class linkAnnotation
  // and it is in annotationLayer of pdfjs
  setPos(props.link.parentElement as HTMLElement);

  // set event listener
  // handle zoom event
  card.value.$el.addEventListener("mousewheel", (e: WheelEvent) => {
    if (!pdfSinglePageViewer) return;
    if (e.ctrlKey === true) {
      e.preventDefault();
      zoom(e.deltaY < 0 ? 0.1 : -0.1);
    }
  });

  card.value.$el.addEventListener("mouseenter", (e: MouseEvent) => {
    props.peekManager.supposeToDestroy = false;
  });

  // handle mouseleave
  card.value.$el.addEventListener("mouseleave", (e: MouseEvent) => {
    close();
  });

  // enable drag to move
  enableDragToMove();

  // show peeker
  show();
});

/**
 * Given the viewerContainer and linkElment, calculate the peekCard position
 * There is no need for user to call this
 * @param viewerContainer
 */
function setPos(linkAnnot: HTMLElement) {
  let viewerContainer = linkAnnot.parentElement?.parentElement?.parentElement
    ?.parentElement as HTMLElement;
  if (!card.value || !viewerContainer) return;

  let viewerRect = viewerContainer.getBoundingClientRect();
  let linkRect = linkAnnot.getBoundingClientRect();

  // peekCard dimension (in px)
  const h = (Math.min(viewerRect.width, viewerRect.height) * 2) / 3;
  const w = h;

  // anchor point
  let left = linkRect.x - viewerRect.x;
  let top = linkRect.y - viewerRect.y;

  // default is to show the card at center top of the link
  left -= w / 2;
  top -= h;
  // check if top has enough space, if no then shift it down
  if (top < 0) top = 5;
  // check if left has enough space, if no then shift it right
  if (left < 0) left = 5;
  // check if right has enough space, if no then shift it to left
  if (left + w > viewerRect.width) left = viewerRect.width - w - 5;

  // card.value.$el.style.position = "relative";
  // card.value.$el.style.position = "absolute";
  card.value.$el.style.width = w + "px";
  card.value.$el.style.height = h + "px";
  card.value.$el.style.top = top + "px";
  card.value.$el.style.left = left + "px";
  card.value.$el.style.zIndex = "1000";
}

function show() {
  if (!card.value.$el) return;
  card.value.$el.style.display = "block";

  enableGrabToPan();
}

function enableGrabToPan() {
  const handtool = new GrabToPan({ element: peekContainer.value });
  handtool.activate();
}

function zoom(delta: number) {
  if (!pdfSinglePageViewer) return;
  pdfSinglePageViewer.currentScale += delta;
}

/**
 * User can close the PeekCard even if it's pinned
 */
function close(force?: boolean) {
  props.peekManager.supposeToDestroy = true;
  if (!!force || !pinned.value) props.peekManager.destroy(props.link.id);
}

function enableDragToMove() {
  let dom = card.value.$el;
  let annotLayerRect: DOMRect;
  let domRect: DOMRect;
  let offsetX = 0;
  let offsetY = 0;
  let shiftX = 0;
  let shiftY = 0;
  let left: number;
  let top: number;

  dom.draggable = true;
  dom.ondragstart = (e: DragEvent) => {
    annotLayerRect = dom.parentElement?.getBoundingClientRect() as DOMRect;
    domRect = dom.getBoundingClientRect();
    offsetX = annotLayerRect.left;
    offsetY = annotLayerRect.top;
    shiftX = e.clientX - domRect.left;
    shiftY = e.clientY - domRect.top;

    // no ghost image when dragging
    if (e.dataTransfer)
      e.dataTransfer.setDragImage(document.createElement("img"), 0, 0);

    // when dragging, automatically set pinned for better interaction
    pinned.value = true;

    // listen to the move and up event in parentElement will make things smoother
    // so that no text selection will happen while dragging
    dom.parentElement.onmousemove = (e: MouseEvent) => {
      // use this to prevent text selection
      e.preventDefault();
      // when drag is released, e.pageX and e.pageY will jump to 0, weird
      // need to calculate tmpLeft/tmpTop first to avoid this
      left = e.pageX - offsetX - shiftX;
      top = e.pageY - offsetY - shiftY;

      if (left < 0 || left + domRect.width > annotLayerRect.width) return;
      if (top < 0 || top + domRect.height > annotLayerRect.height) return;

      dom.style.left = `${left}px`;
      dom.style.top = `${top}px`;
    };

    dom.parentElement.onmouseup = (e: MouseEvent) => {
      dom.parentElement.onmousemove = null;
      dom.parentElement.onmouseup = null;
    };
  };

  // Webkit can' deal with these events, have to use the above implementations
  // dom.ondrag = (e: DragEvent) => {
  //   console.log("on drag", e);
  //   // when drag is released, e.pageX and e.pageY will jump to 0, weird
  //   // need to calculate tmpLeft/tmpTop first to avoid this
  //   left = e.pageX - offsetX - shiftX;
  //   top = e.pageY - offsetY - shiftY;

  //   if (left < 0 || left + domRect.width > annotLayerRect.width) return;
  //   if (top < 0 || top + domRect.height > annotLayerRect.height) return;

  //   dom.style.left = `${left}px`;
  //   dom.style.top = `${top}px`;
  // };

  // dom.ondragend = (e: DragEvent) => {
  //   console.log("on drag end", e);
  //   dom.onmousemove = null;
  // };
}

/**
 * Set dark or light mode of the peekCard
 * @param darkMode
 */
function setViewMode(darkMode: boolean) {
  if (!peekContainer.value) return;
  let viewer = peekContainer.value.querySelector(".pdfViewer") as HTMLElement;
  if (!viewer) return;
  if (darkMode)
    peekContainer.value.style.filter =
      "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
  else peekContainer.value.style.filter = "unset";
}

function resizeCard(e: MouseEvent) {
  // prevent dragging the card
  e.preventDefault();
  if (!card.value) return;
  const el = card.value.$el as HTMLElement;
  const rect = el.getBoundingClientRect();
  el.parentElement!.onmousemove = (ev: MouseEvent) => {
    el.style.width = ev.pageX - rect.left + "px";
    el.style.height = ev.pageY - rect.top + "px";
  };
  el.parentElement!.onmouseup = (ev: MouseEvent) => {
    el.parentElement!.onmousemove = null;
    el.parentElement!.onmouseup = null;
  };
}

defineExpose({ close });
</script>
<style lang="scss">
.peekCard {
  position: absolute !important;
  background: var(--color-pdfreader-viewer-bkgd);
  display: none;
  z-index: 1000;
  border: 1px solid var(--q-edge);

  &:hover {
    box-shadow: 0 0 0px 2px rgba($primary, 0.8) !important;
    z-index: 1001 !important;
  }
  &:active {
    box-shadow: 0 0 0px 2px rgba($primary, 0.8) !important;
    z-index: 1001 !important;
  }
}
.peekContainer {
  position: absolute;
  left: 0;
  top: 0;
  overflow: auto;
  height: 100%;
  width: 100%;
}
</style>
