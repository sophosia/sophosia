<template>
  <q-splitter
    class="PDF-reader"
    v-model="rightMenuSize"
    :separator-class="{ 'q-splitter-separator': showRightMenu }"
    :disable="!showRightMenu"
    reverse
    :limits="[0, 60]"
    @update:model-value="(size) => resizeRightMenu(size)"
  >
    <template v-slot:before>
      <PDFToolBar
        class="PDF-toolbar"
        :pdfState="pdfApp.state"
        :pageLabels="pdfApp.pageLabels"
        :matchesCount="pdfApp.matchesCount"
        v-model:showRightMenu="showRightMenu"
      />
      <div
        ref="viewerContainer"
        class="viewerContainer"
      >
        <div class="pdfViewer"></div>
        <div
          v-if="!initialized"
          style="position: relative; top: 50%"
          class="text-center"
        >
          <q-circular-progress
            indeterminate
            rounded
            color="primary"
            size="xl"
          />
        </div>
        <AnnotCard
          v-if="showAnnotCard && pdfApp.annotStore.selected"
          :style="style"
          :annot="(pdfApp.annotStore.selected as Annotation)"
          ref="card"
        />
        <FloatingMenu
          v-if="showFloatingMenu"
          :style="style"
          :projectid="props.projectId"
          @highlightText="(color: string) => highlightText(color)"
          @explainTextVisibility="toggleExplainWindow"
          @explainText="explainText"
          
        />
      </div>
      <ExplainWindow :isVisible="explainIsVisible" :text="selectedText" @explainTextVisibility="toggleExplainWindow" />

      <PeekCard
        v-for="link in pdfApp.peekManager.links"
        :key="link.id"
        :link="link"
        :peekManager="pdfApp.peekManager"
        :darkMode="pdfApp.state.darkMode"
      />
    </template>
    <template v-slot:after>
      <RightMenu />
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
import { PDFPageView } from "pdfjs-dist/web/pdf_viewer";
import {
  AnnotationData,
  AnnotationType,
  PageType,
  Project,
  Rect,
} from "src/backend/database";
import { computed, nextTick, onMounted, provide, ref, watch } from "vue";
import { KEY_pdfApp, KEY_project } from "./injectKeys";

import AnnotCard from "./AnnotCard.vue";
import FloatingMenu from "./FloatingMenu.vue";
import PDFToolBar from "./PDFToolBar.vue";
import PeekCard from "./PeekCard.vue";
import RightMenu from "./RightMenu.vue";
import ExplainWindow from "../library/ExplainWindow.vue";

import { QSplitter, throttle } from "quasar";
import { db } from "src/backend/database";
import { Annotation, Ink } from "src/backend/pdfannotation/annotations";
import PDFApplication from "src/backend/pdfreader";
import { getProject } from "src/backend/project";
import { useLayoutStore } from "src/stores/layoutStore";
const layoutStore = useLayoutStore();

/**********************************
 * Props, Data, and component refs
 **********************************/
const props = defineProps({
  projectId: { type: String, required: true },
  focusAnnotId: { type: String, required: false },
});

const initialized = ref(false);
const  explainIsVisible = ref(false);


// viewer containers
const viewerContainer = ref<HTMLDivElement>();

// ready to save data
const project = ref<Project>();

// right menu (don't use stateStore since there will be many readerPages)
const rightMenuSize = ref(0);
const prvRightMenuSize = ref(0);
const showRightMenu = computed({
  get() {
    return rightMenuSize.value > 0;
  },
  set(visible: boolean) {
    if (visible) {
      rightMenuSize.value = Math.max(prvRightMenuSize.value, 40);
    } else {
      prvRightMenuSize.value = rightMenuSize.value;
      rightMenuSize.value = 0;
    }
  },
});

// annot card & colorpicker
const card = ref();
const showAnnotCard = ref(false);
const showFloatingMenu = ref(false);
const selectionPage = ref(0);
const style = ref("");
const selectedText =ref("");

// PDFApplicaton
const pdfApp = new PDFApplication(props.projectId);
const renderEvt = ref<{
  pageNumber: number;
  source: PDFPageView;
  error: Error | null;
}>();

/******************************
 * RightMenu
 ******************************/

/**
 * Resizes the right-side menu based on user interaction with the splitter.
 * @param {number} size - The new size of the right menu.
 */
function resizeRightMenu(size: number) {
  if (size < 15) showRightMenu.value = false;
}

/********************************
 * Explain Window
 *********************************/

 /**
  * Toggles the visibility of the explain window.
  * @param show Flag indicating whether to show or hide the explain window.
  */
function toggleExplainWindow(show: boolean){
  console.log('Toggling explain window:', show);
  explainIsVisible.value = show;
  console.log('explainIsVisible after update:', explainIsVisible.value);
}

function explainText(text: string){
  console.log('Explain text:', text);
  selectedText.value = text;
  console.log('Selected text:', selectedText.value);
}


/*******************************
 * AnnotCard & FloatingMenu
 *******************************/
/**
 * Toggles the visibility of the floating menu for text selection actions.
 * The menu is positioned based on the page and selection coordinates.
 * @param {boolean} show - Flag indicating whether to show or hide the menu.
 * @param {number} [page] - The page number where the selection is made.
 */
function toggleFloatingMenu(show: boolean, page?: number) {
  if (!show) {
    showFloatingMenu.value = false;
  } else {
    // if no page is given, that means no seleciton
    if (!page) return;
    selectionPage.value = page;

    // find the selection on the page
    let hasSelection = false;
    let selection = window.getSelection();
    if (selection === null) return;
    let rects = [] as DOMRectList | DOMRect[];
    if (!!selection.focusNode) {
      rects = selection.getRangeAt(0).getClientRects();
      if (rects.length > 1) {
        hasSelection = true;
      } else if (rects.length == 1 && rects[0].width > 1) {
        hasSelection = true;
      } else {
        hasSelection = false;
      }
    }

    if (hasSelection) {
      showFloatingMenu.value = true;
      setPosition(rects);
    }
  }
}

/**
 * Toggles the annotation card visibility for displaying or editing annotations.
 * Positions the card based on the annotation's location on the page.
 * @param {boolean} show - Flag indicating whether to show or hide the annotation card.
 * @param {Annotation} [annot] - The annotation object for which the card is shown.
 */
function toggleAnnotCard(show: boolean, annot?: Annotation) {
  if (!show) {
    showAnnotCard.value = false;
  } else {
    if (!annot) return;
    setPosition(annot.doms.map((dom) => dom.getBoundingClientRect()));
    showAnnotCard.value = true;
    nextTick(() => {
      enableDragToMoveAnnotCard();
    });
  }
}

/**
 * Sets the position of the floating menu or annotation card relative to the PDF viewer.
 * Calculates the position based on the provided DOMRect objects.
 * @param {DOMRect[] | DOMRectList} rects - The DOMRect objects representing the position of text selection or annotation.
 */
function setPosition(rects: DOMRect[] | DOMRectList) {
  if (!viewerContainer.value) return;
  let viewer = viewerContainer.value.querySelector(
    "div.pdfViewer"
  ) as HTMLElement;
  let bgRect = viewer.getBoundingClientRect();
  let top = 0;
  let mid = 0;
  let n = 0; // number of non-empty rect
  for (let rect of rects) {
    if (rect.width < 0.1) continue;
    top = Math.max(top, rect.bottom);
    mid += (rect.left + rect.right) / 2;
    n++;
  }
  mid /= n; // averaged mid point

  style.value = `
  background: var(--color-pdfreader-colorpicker-bkgd);
  position: absolute;
  left: ${mid - bgRect.left - 75}px;
  top: ${top - bgRect.top + 20}px;
  z-index: 100;
  `;
}

/**
 * Enables dragging functionality for the annotation card, allowing it to be moved around the screen.
 */
function enableDragToMoveAnnotCard() {
  if (!card.value) return;
  card.value.isMovable = true;
  const cardEl = card.value.$el as HTMLElement;
  const cardHandleEl = cardEl.firstChild as HTMLElement;
  cardHandleEl.onmousedown = (e: MouseEvent) => {
    let x = e.clientX;
    let y = e.clientY;
    let shiftX = 0;
    let shiftY = 0;
    let top = parseFloat(cardEl.style.top);
    let left = parseFloat(cardEl.style.left);
    const parentDiv = cardEl.parentElement as HTMLElement;
    parentDiv.onmousemove = (ev: MouseEvent) => {
      ev.preventDefault();
      shiftX = ev.clientX - x;
      shiftY = ev.clientY - y;
      cardEl.style.left = `${left + shiftX}px`;
      cardEl.style.top = `${top + shiftY}px`;
    };

    cardHandleEl.onmouseup = () => {
      // cardHandleEl.onmousedown = null;
      parentDiv.onmousemove = null;
    };
  };
}

/**
 * Highlights the selected text in the PDF document with the specified color.
 * Creates a new annotation for the highlighted text.
 * @param {string} color - The color to use for highlighting the text.
 */
function highlightText(color: string) {
  if (!renderEvt.value) return;
  let annot = pdfApp.annotFactory.buildSelectionBasedAnnot(
    AnnotationType.HIGHLIGHT,
    color,
    renderEvt.value
  );
  if (annot) {
    pdfApp.annotStore.add(annot, true);
    annot.draw(renderEvt.value);
    let annotId = annot.data._id;
    annot.doms.forEach((dom) => {
      dom.onmousedown = () => pdfApp.annotStore.setActive(annotId);
    });
    annot.hasEvtHandler = true;
  }
  toggleFloatingMenu(false);
}

/***************************
 * PDF realated
 ***************************/
/**
 * Loads a PDF into the viewer and initializes necessary states.
 * @param {string} projectId - The ID of the project associated with the PDF.
 */
async function loadPDF(projectId: string) {
  project.value = (await getProject(projectId, {
    includePDF: true,
  })) as Project;
  if (!project.value.path) return;
  // load state before loading pdf
  await pdfApp.loadState(project.value._id);
  await pdfApp.loadAnnotations();
  await pdfApp.loadPDF(project.value.path);
}

/******************
 * Provides
 ******************/
provide(KEY_project, project);
provide(KEY_pdfApp, pdfApp);

/***********************
 * Watchers
 ***********************/
watch(pdfApp.state, (state) => {
  // pdfState is reactive, so it's deep wather automatically
  if (!pdfApp.ready.value) return;
  pdfApp.saveState(state);
});

watch(
  () => props.focusAnnotId,
  () => {
    // scroll to annot when focusAnnotId changes
    if (props.focusAnnotId) pdfApp.scrollAnnotIntoView(props.focusAnnotId);
  }
);

/**************************************************
 * Implement eventhandlers and init PDFApplication
 **************************************************/
onMounted(async () => {
  initialized.value = false;
  if (!viewerContainer.value) return;
  pdfApp.init(viewerContainer.value as HTMLDivElement);

  // scroll to annot when pages are ready
  pdfApp.eventBus?.on("pagesinit", () => {
    if (props.focusAnnotId) pdfApp.scrollAnnotIntoView(props.focusAnnotId);
  });
  pdfApp.eventBus?.on(
    "annotationeditorlayerrendered",
    async (e: {
      error: Error | null;
      pageNumber: number;
      source: PDFPageView;
    }) => {
      // draw annotations on active page
      let annots = pdfApp.annotStore.getByPage(e.pageNumber);
      let inkAnnot: Ink | undefined = undefined;
      let clickedAnnotId: string;
      for (let annot of annots) {
        // draw annotations (create Konva stage if it's ink)
        annot.draw(e);
        if (annot.data.type === AnnotationType.INK) {
          // bind event handlers to Konva stage
          inkAnnot = annot as Ink;
          inkAnnot.bindEventHandlers(pdfApp.state);
        } else {
          // bind event handlers to doms
          if (
            annot.data.type === AnnotationType.RECTANGLE ||
            annot.data.type === AnnotationType.COMMENT
          )
            annot.enableDragToMove();
        }
      }

      // monitor tool change and create konva stage as needed
      e.source.div.onmousemove = throttle(() => {
        if (
          pdfApp.state.tool === AnnotationType.INK ||
          pdfApp.state.tool === AnnotationType.ERASER
        ) {
          // in freedraw mose
          if (!inkAnnot) {
            // create canvas if there is none
            let annotData = {
              _id: `SA${db.nanoid}`,
              timestampAdded: Date.now(),
              timestampModified: Date.now(),
              dataType: "pdfAnnotation",
              projectId: props.projectId,
              pageNumber: e.pageNumber,
              content: "",
              color: "",
              rects: [] as Rect[],
              type: AnnotationType.INK,
            } as AnnotationData;
            let annot = pdfApp.annotFactory.build(annotData);
            if (annot) {
              pdfApp.annotStore.add(annot, true);
              inkAnnot = annot as Ink;
              inkAnnot.draw(e);
              inkAnnot.bindEventHandlers(pdfApp.state);
            }
          }
          inkAnnot?.setDrawable(true);
        } else {
          inkAnnot?.setDrawable(false);
        }
      }, 500);

      // event handlers to handle user interactions
      e.source.div.onmousedown = (ev: MouseEvent) => {
        toggleAnnotCard(false);
        toggleFloatingMenu(false);
        // if clicking on an annotation, set it active and return;
        clickedAnnotId =
          (ev.target as HTMLElement).getAttribute("annotation-id") ||
          ((ev.target as HTMLElement).parentNode as HTMLElement).getAttribute(
            "annotation-id"
          ) ||
          "";
        pdfApp.annotStore.setActive(clickedAnnotId);
        if (clickedAnnotId) {
          e.source.div.onmouseup = () => {
            toggleAnnotCard(true, pdfApp.annotStore.selected as Annotation);
          };
          return;
        } else {
          // set the props.focusAnnotId to ""
          // so that user can reselect the annotation by clicking a link in note
          // need to better way to do this
          if (project.value) {
            layoutStore.openPage({
              id: project.value._id,
              type: PageType.ReaderPage,
              label: project.value.label,
            });
          }
        }

        // otherwise continue to determine what user is doing
        switch (pdfApp.state.tool) {
          case AnnotationType.CURSOR:
            e.source.div.onmouseup = () => {
              toggleFloatingMenu(true, e.pageNumber);
              renderEvt.value = e;
            };
            break;
          case AnnotationType.HIGHLIGHT:
          case AnnotationType.UNDERLINE:
          case AnnotationType.STRIKEOUT:
            e.source.div.onmouseup = () => {
              let annot = pdfApp.annotFactory.buildSelectionBasedAnnot(
                pdfApp.state.tool,
                pdfApp.state.color,
                e
              );
              if (annot) {
                pdfApp.annotStore.add(annot, true);
                annot.draw(e);
              }
            };
            break;
          case AnnotationType.RECTANGLE:
            let canvasWrapper = e.source.div.querySelector(
              ".canvasWrapper"
            ) as HTMLElement;
            // temporary rectangle for rectangular highlight
            let x1 = ev.clientX;
            let y1 = ev.clientY;
            let layerRect = canvasWrapper.getBoundingClientRect();
            let tempRect = document.createElement("div");
            tempRect.style.position = "absolute";
            tempRect.style.background = pdfApp.state.color;
            tempRect.style.mixBlendMode = "multiply";
            tempRect.style.left = `${x1 - layerRect.x}px`;
            tempRect.style.top = `${y1 - layerRect.y}px`;
            canvasWrapper.append(tempRect);

            e.source.div.onmousemove = (ev: MouseEvent) => {
              ev.preventDefault();
              if (!tempRect) return;
              tempRect.style.width = `${ev.clientX - x1}px`;
              tempRect.style.height = `${ev.clientY - y1}px`;
            };
            e.source.div.onmouseup = (ev: MouseEvent) => {
              tempRect.remove();
              // create annotation
              let rects = [
                {
                  left: Math.min(x1, ev.clientX),
                  top: Math.min(y1, ev.clientY),
                  width: Math.abs(x1 - ev.clientX),
                  height: Math.abs(y1 - ev.clientY),
                },
              ];
              if (rects[0].width < 1 || rects[0].height < 1) return;
              rects[0] = pdfApp.annotFactory.offsetTransform(
                rects[0],
                canvasWrapper
              );

              let annotData = {
                _id: `SA${db.nanoid}`,
                timestampAdded: Date.now(),
                timestampModified: Date.now(),
                type: AnnotationType.RECTANGLE,
                rects: rects,
                color: pdfApp.state.color,
                pageNumber: e.pageNumber,
                projectId: pdfApp.state.projectId,
                dataType: "pdfAnnotation",
                content: "",
              } as AnnotationData;
              let annot = pdfApp.annotFactory.build(annotData);
              if (annot) {
                annot.draw(e);
                annot.enableDragToMove();
                pdfApp.annotStore.add(annot, true);
              }
              e.source.div.onmousemove = null;
              e.source.div.onmouseup = null;
            };
            break;
          case AnnotationType.COMMENT:
            e.source.div.onmouseup = (ev: MouseEvent) => {
              let canvasWrapper = e.source.div.querySelector(
                ".canvasWrapper"
              ) as HTMLElement;
              // create annotation
              let rects = [
                {
                  left: ev.clientX,
                  top: ev.clientY,
                  width: 0,
                  height: 0,
                },
              ];
              rects[0] = pdfApp.annotFactory.offsetTransform(
                rects[0],
                canvasWrapper
              );
              let annotData = {
                _id: `SA${db.nanoid}`,
                timestampAdded: Date.now(),
                timestampModified: Date.now(),
                type: AnnotationType.COMMENT,
                rects: rects,
                color: pdfApp.state.color,
                pageNumber: e.pageNumber,
                projectId: pdfApp.state.projectId,
                dataType: "pdfAnnotation",
                content: "",
              } as AnnotationData;
              let annot = pdfApp.annotFactory.build(annotData);
              if (annot) {
                annot.draw(e);
                annot.enableDragToMove();
                pdfApp.annotStore.add(annot, true);
              }
              // return to cursor after comment is placed
              pdfApp.changeTool(AnnotationType.CURSOR);
            };
            break;
        }
      };
    }
  );

  await loadPDF(props.projectId);
  initialized.value = true;
});
</script>
<style lang="scss">
@use "pdfjs-dist/web/pdf_viewer.css";

.viewerContainer {
  position: absolute;
  overflow: auto;
  // toolbar: 36px
  height: calc(100% - 36px);
  top: 36px;
  width: calc(100% - 10px); // so the right scroll bar does not touch right edge
  background-color: var(--color-pdfreader-viewer-bkgd);
  // enable selections
  user-select: auto;
  -moz-user-select: auto;
  -ms-user-select: auto;
  -webkit-user-select: text;
}

.page {
  // fix no gap between pages
  box-sizing: unset;
}

.hidden,
[hidden] {
  // fix pdfjs-dist 3.7.107 standard annot popup won't hidden
  display: none !important;
}

.activeAnnotation {
  outline-offset: 3px;
  outline: dashed 2px $primary;
}

// fix popup not correctly rendered
.annotationLayer .popup {
  // fix white text color in standard annotations
  // standard annotation means annotation made by adobe pdf etc
  color: black;
}

.annotationLayer .popup h1 {
  // fix weird title in standard annotation
  font-weight: bold;
  line-height: unset;
  letter-spacing: unset;
}

// .annotationEditorLayer will be hidden if there is no pdfjs-generated annotation
// do not hide user injected annotations
.annotationEditorLayer {
  display: unset !important;
}
</style>
