import * as pdfjsLib from "pdfjs-dist";
import * as pdfjsViewer from "pdfjs-dist/web/pdf_viewer";
import {
  PDFFindController,
  PDFPageView,
  PDFViewer,
} from "pdfjs-dist/web/pdf_viewer";
import { debounce } from "quasar";
import { nextTick, reactive, ref } from "vue";
import {
  AnnotationType,
  EraserType,
  PDFSearch,
  PDFState,
  SpreadMode,
  TOCNode,
  db,
} from "../database";
import { AnnotationFactory, AnnotationStore } from "../pdfannotation";
import { Annotation } from "../pdfannotation/annotations";
import { PeekManager } from "./peekManager";
pdfjsLib.GlobalWorkerOptions.workerSrc = "pdfjs/pdf.worker.min.js"; // in the public folder

import { open } from "@tauri-apps/api/shell";
import { convertFileSrc } from "@tauri-apps/api/tauri";

/**
 * Class for managing PDF viewing and annotation functionality.
 */
export default class PDFApplication {
  container: HTMLDivElement | undefined;
  eventBus: pdfjsViewer.EventBus | undefined;
  pdfLinkService: pdfjsViewer.PDFLinkService | undefined;
  pdfFindController: pdfjsViewer.PDFFindController | undefined;
  pdfViewer: pdfjsViewer.PDFViewer | undefined;
  peekManager: PeekManager;
  pdfDocument: pdfjsLib.PDFDocumentProxy | undefined;

  annotStore: AnnotationStore;
  annotFactory: AnnotationFactory;

  projectId: string;
  ready = ref(true);
  state = reactive<PDFState>({} as PDFState);
  outline = reactive<TOCNode[]>([]);
  pageLabels = reactive<string[]>([]);
  matchesCount = reactive({ current: -1, total: 0 });

  // saveState: typeof debounce<(state: PDFState) => Promise<void>>;
  saveState: ((this: unknown, state: PDFState) => void) & {
    cancel(): void;
  };

  constructor(projectId: string) {
    this.projectId = projectId;
    this.annotStore = new AnnotationStore(projectId);
    this.annotFactory = new AnnotationFactory(projectId);
    this.peekManager = new PeekManager();
    // make saveState a debounce function
    // it ignores the signals 500ms after each call
    this.saveState = debounce(this._saveState, 500);
    Object.assign(this.state, {
      dataType: "pdfState",
      projectId: projectId,
      pagesCount: 0,
      currentPageNumber: 1,
      currentScale: 1,
      currentScaleValue: "1",
      spreadMode: 0,
      tool: "cursor",
      color: "#FFFF00",
      scrollLeft: 0,
      scrollTop: 0,
      inkThickness: 5,
      inkOpacity: 1,
      eraserType: EraserType.STROKE,
      eraserThickness: 20,
    } as PDFState);
  }

  /**
   * Initializes the PDF viewer and associated components.
   * @param {HTMLDivElement} container - The container element for the PDF viewer.
   */
  init(container: HTMLDivElement) {
    const eventBus = new pdfjsViewer.EventBus();
    const pdfLinkService = new pdfjsViewer.PDFLinkService({
      eventBus,
    });
    const pdfFindController = new pdfjsViewer.PDFFindController({
      eventBus,
      linkService: pdfLinkService,
    });

    // l10n resource
    const link = document.createElement("link");
    link.rel = "resources";
    link.type = "application/l10n";
    link.href = "pdfjs/l10n/en-US/viewer.properties";
    document.head.append(link);
    const l10n = new pdfjsViewer.GenericL10n("en-US");

    const pdfViewer = new pdfjsViewer.PDFViewer({
      container,
      eventBus: eventBus,
      linkService: pdfLinkService,
      findController: pdfFindController,
      annotationEditorMode: pdfjsLib.AnnotationEditorType.NONE,
      l10n: l10n,
    });
    // must have this otherwise find controller does not work
    pdfLinkService.setViewer(pdfViewer);

    this.container = container;
    this.eventBus = eventBus;
    this.pdfLinkService = pdfLinkService;
    this.pdfFindController = pdfFindController;
    this.pdfViewer = pdfViewer;
    this.pdfDocument = undefined; // initialize in loadPDF

    // install internal event listener
    eventBus.on("pagesinit", () => {
      if (this.container)
        this.container.addEventListener("mousewheel", (e) =>
          this.handleCtrlScroll(e as WheelEvent)
        );
      this.changePageNumber(this.state.currentPageNumber);
      this.changeSpreadMode(this.state.spreadMode);
      this.changeScale({ scale: this.state.currentScale });
      this.changeTool(this.state.tool);
      this.changeViewMode(this.state.darkMode);
      if (this.pdfViewer) this.state.pagesCount = this.pdfViewer.pagesCount;
      this.ready.value = true;
    });
    eventBus.on("annotationlayerrendered", () => {
      if (!this.container) return;
      this.container
        .querySelectorAll("section.linkAnnotation")
        .forEach((section) => {
          let link = section.querySelector("a");
          if (!link) return;
          if (section.hasAttribute("data-internal-link")) {
            // peek internal links
            link.oncontextmenu = (e) => {
              e.preventDefault();
              this.peekManager.supposeToDestroy = false;
              setTimeout(() => {
                if (!link) return;
                if (this.peekManager) this.peekManager.create(link);
              }, 200);
            };
            link.onmouseleave = () => {
              this.peekManager.supposeToDestroy = true;
              setTimeout(() => {
                if (!link) return;
                if (this.peekManager) this.peekManager.destroy(link.id);
              }, 200);
            };
          } else {
            // external links must open using default browser
            let href = link.href;
            link.onclick = async (e) => {
              e.preventDefault();
              // window.browser.openURL(href);
              await open(href);
            };
          }
        });
    });

    eventBus.on(
      "pagechanging",
      async (e: {
        source: PDFViewer;
        pageNumber: number;
        pageLabel: string | null;
        previous: number;
      }) => {
        // update pdfState when scrolling
        this.state.currentPageNumber = e.pageNumber;
        // if the pdf is initially loaded, scroll to last position
        // this line is here because if the scrollto is called too early
        // then the position will be slightly different each time
        // do not remove if (!ready) otherwise pdf can't scroll
        if (!this.ready.value) {
          if (!this.container) return;
          await nextTick();
          this.container.scrollTo(this.state.scrollLeft, this.state.scrollTop);
        }
      }
    );
    eventBus.on(
      "scalechanging",
      (e: {
        source: PDFPageView;
        scale: number;
        presetValue: string | undefined;
      }) => {
        // let pdfApp calculate the scale, then change the pdfState
        this.state.currentScale = e.scale;
        if (e.presetValue) this.state.currentScaleValue = e.presetValue;
      }
    );
    eventBus.on(
      "spreadmodechanged",
      (e: { source: PDFViewer; mode: number }) => {
        this.state.spreadMode = e.mode;
      }
    );
    // find controller
    eventBus.on(
      "updatefindmatchescount",
      (e: {
        source: PDFFindController;
        matchesCount: { current: number; total: number };
      }) => {
        // update the current/total founded during searching
        // this will only fired when something found
        Object.assign(this.matchesCount, e.matchesCount);
      }
    );
    eventBus.on(
      "updatetextlayermatches",
      (e: { source: PDFFindController; pageIndex: number }) => {
        // if not found, set the matchesCount.total to 0
        let findController = e.source;
        let selected = findController.selected;
        if (selected === undefined) return;
        if (findController.pageMatches === undefined) return;
        if (selected.matchIdx == -1 && selected.pageIdx == -1) {
          Object.assign(this.matchesCount, { current: -1, total: 0 });
        } else {
          let pageIdx = selected.pageIdx;
          let current = selected.matchIdx + 1;
          for (let i = 0; i < pageIdx; i++) {
            current += findController.pageMatches[i].length;
          }
          this.matchesCount.current = current;
        }
      }
    );
  }

  /**
   * Loads a PDF document into the viewer.
   * @param {string} filePath - The file path of the PDF document.
   */
  async loadPDF(filePath: string) {
    const cMapUrl =
      (process.env.DEV ? "http://localhost:9000/" : "") + "pdfjs/cmaps/";
    // TODO: wait until tauri-v2 to have a better performance on this
    // let buffer = await readBinaryFile(filePath);
    const url = await convertFileSrc(filePath);
    this.pdfDocument = await pdfjsLib.getDocument({
      // data: buffer,
      url: url,
      cMapUrl: cMapUrl,
      cMapPacked: true,
    }).promise;
    if (this.pdfLinkService)
      this.pdfLinkService.setDocument(this.pdfDocument, null);
    if (this.pdfFindController)
      this.pdfFindController.setDocument(this.pdfDocument);
    if (this.pdfViewer) this.pdfViewer.setDocument(this.pdfDocument);
    this.peekManager.setDocument(this.pdfDocument);
    this.getTOC();
    this.getPageLabels();
  }

  /**
   * Loads the saved state for a specific project.
   * @param {string} projectId - The project ID.
   * @returns {Promise<PDFState | undefined>} The loaded PDF state or undefined if an error occurs.
   */
  async loadState(projectId: string): Promise<PDFState | undefined> {
    try {
      let pdfState = await db.get("SS" + projectId.slice(2));

      // default state
      let state = {
        _id: "",
        dataType: "pdfState",
        projectId: projectId,
        pagesCount: 0,
        currentPageNumber: 1,
        currentScale: 1,
        currentScaleValue: "1",
        spreadMode: 0,
        darkMode: false,
        tool: "cursor",
        color: "#FFFF00",
        inkThickness: 5,
        inkOpacity: 100,
        scrollLeft: 0,
        scrollTop: 0,
      } as PDFState;
      // doing this we can make sure if anything missing from db, the default values are there
      Object.assign(state, pdfState);
      Object.assign(this.state, state);
      return state;
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Saves the current state of the PDF viewer.
   * @param {PDFState} state - The state to save.
   */
  private async _saveState(state: PDFState) {
    if (!this.container) return;
    // also save the scroll position
    state.scrollLeft = this.container.scrollLeft;
    state.scrollTop = this.container.scrollTop;

    try {
      if (!state._id) state._id = `SS${state.projectId.slice(2)}`;
      await db.put(state);
    } catch (error) {
      console.log(error);
    }

    // cancel debounce after 400ms
    setTimeout(() => {
      this.saveState.cancel();
    }, 400);
  }

  /**
   * Create annotations from db
   */
  async loadAnnotations() {
    let annotDatas = await this.annotStore.loadFromDB();
    for (let annotData of annotDatas) {
      let annot = this.annotFactory.build(annotData);
      if (annot) this.annotStore.add(annot);
    }
  }

  /**
   * Changes the current page number in the PDF viewer.
   * @param {number} pageNumber - The page number to navigate to.
   */
  changePageNumber(pageNumber: number) {
    if (!this.pdfViewer) return;
    this.pdfViewer.currentPageNumber = pageNumber;
  }

  /**
   * Sets the spread mode for viewing pages in the PDF.
   * @param {SpreadMode} spreadMode - The spread mode to apply.
   */
  changeSpreadMode(spreadMode: SpreadMode) {
    if (!this.pdfViewer) return;
    this.pdfViewer.spreadMode = spreadMode;
  }

  /**
   * Adjusts the scale of the PDF view.
   * @param {Object} params - Parameters for scaling, including delta, scale value, and scale factor.
   */
  changeScale(params: {
    delta?: number;
    scaleValue?: "page-width" | "page-height";
    scale?: number;
  }) {
    if (!this.pdfViewer) return;
    if (!!params.delta) this.pdfViewer.currentScale += params.delta;

    if (!!params.scaleValue)
      this.pdfViewer.currentScaleValue = params.scaleValue;

    if (!!params.scale) this.pdfViewer.currentScale = params.scale;
  }

  /**
   * Changes the current annotation tool.
   * @param {AnnotationType} tool - The annotation tool to be set.
   */
  changeTool(tool: AnnotationType) {
    this.state.tool = tool;
  }

  /**
   * Updates the color setting for annotations.
   * @param {string} color - The color value to set.
   */
  changeColor(color: string) {
    this.state.color = color;
  }

  /**
   * Toggles the dark mode view for the PDF.
   * @param {boolean} darkMode - Indicates whether to enable or disable dark mode.
   */
  changeViewMode(darkMode: boolean) {
    this.state.darkMode = darkMode;
    let viewer = this.container?.querySelector(
      ".pdfViewer"
    ) as HTMLElement | null;
    if (!viewer) return;
    if (darkMode)
      viewer.style.filter =
        "invert(64%) contrast(228%) brightness(80%) hue-rotate(180deg)";
    else viewer.style.filter = "unset";
  }

  /**
   * Sets the thickness for ink-based annotations.
   * @param {number} thickness - The thickness of the ink.
   */
  changeInkThickness(thickness: number) {
    this.state.inkThickness = thickness;
  }

  /**
   * Sets the opacity for ink-based annotations.
   * @param {number} opacity - The opacity level of the ink.
   */
  changeInkOpacity(opacity: number) {
    this.state.inkOpacity = opacity;
  }

  /**
   * Handles scroll events with control key for zooming in and out.
   * @param {WheelEvent} e - The wheel event triggered by user action.
   */
  handleCtrlScroll(e: WheelEvent) {
    if (!this.pdfViewer || !this.container) return;
    if (e.ctrlKey === true) {
      // this is not scrolling, so we need to
      // disable the default action avoid the offsetParent not set error
      e.preventDefault();
      let oldScale = this.pdfViewer.currentScale;
      if (e.deltaY < 0) {
        let container = this.container;
        let newScale = Math.min(oldScale + 0.1, 2);
        this.pdfViewer.currentScale = newScale;

        let ratio = newScale / oldScale - 1;
        // shift the scroll bar if cursor is on the right / bottom of the screen
        // the default zoom-in takes the upper-left conner as scale origin
        if (e.pageX > window.innerWidth * (6 / 10))
          container.scrollLeft += ratio * (container.scrollLeft + e.pageX);
        if (e.pageY > window.innerHeight * (6 / 10))
          container.scrollTop += ratio * e.pageY;
      } else {
        let newScale = Math.max(oldScale - 0.1, 0.3);
        this.pdfViewer.currentScale = newScale;
      }
    }
  }

  /**
   * Retrieves page labels for the PDF document.
   */
  async getPageLabels() {
    if (this.pdfDocument === undefined) return [];
    let labels = await this.pdfDocument.getPageLabels();
    if (labels === null) labels = [];
    Object.assign(this.pageLabels, labels);
  }

  /**
   * Loads the table of contents for the PDF document.
   */
  async getTOC() {
    if (this.pdfDocument === undefined) return [];

    function _dfs(oldNodes: TOCNode[]): TOCNode[] {
      const tree = [] as TOCNode[];
      for (let k in oldNodes) {
        let node = {
          label: oldNodes[k].title,
          children: _dfs(oldNodes[k].items),
        } as TOCNode;
        if (typeof oldNodes[k].dest === "string") node.dest = oldNodes[k].dest;
        else {
          let dest = oldNodes[k].dest;
          if (!!dest && dest?.length > 0) node.ref = dest[0];
        }
        tree.push(node);
      }
      return tree;
    }

    try {
      let outline = await this.pdfDocument.getOutline();
      Object.assign(this.outline, _dfs(outline as TOCNode[]));
    } catch (error) {
      console.log(error);
    }
  }

  /**
   * Retrieves the page number associated with a TOCNode.
   * @param {TOCNode} node - The table of contents node.
   * @returns {Promise<number>} The page number associated with the TOCNode.
   */
  async getTOCPage(node: TOCNode): Promise<number> {
    if (this.pdfDocument === undefined) return 1;

    let pageNumber = 1;

    if (node.ref === undefined) {
      let dest = await this.pdfDocument.getDestination(node.dest as string);
      if (!!dest && dest?.length > 0) {
        let ref = dest[0];
        let pageIndex = await this.pdfDocument.getPageIndex(ref);
        pageNumber = pageIndex + 1;
      }
    } else {
      let pageIndex = await this.pdfDocument.getPageIndex(node.ref);
      pageNumber = pageIndex + 1;
    }
    return pageNumber;
  }

  /**
   * Navigates to a specified page from the table of contents.
   * @param {TOCNode} node - The TOCNode representing the target page.
   */
  async clickTOC(node: TOCNode) {
    let pageNumber = await this.getTOCPage(node);
    this.changePageNumber(pageNumber);
  }

  /**
   * Initiates a text search in the PDF document.
   * @param {PDFSearch} search - The search parameters.
   */
  searchText(search: PDFSearch) {
    if (!this.eventBus) return;
    this.eventBus.dispatch("find", search);
  }

  /**
   * Navigates to the next or previous search match.
   * @param {number} delta - The direction and magnitude to move among search matches.
   */
  changeMatch(delta: number) {
    if (!this.pdfFindController || !this.eventBus) return;
    // delta can only be +1 (next) or -1 (prev)
    // highlight the next/previous match
    if (this.pdfFindController.selected === undefined) return;
    if (this.pdfFindController.pageMatches === undefined) return;

    let currentMatch = this.pdfFindController.selected;
    let matches = this.pdfFindController.pageMatches;

    let pageIdx = currentMatch.pageIdx;
    let newMatchIdx = currentMatch.matchIdx + delta;
    let matchIdxList = matches[pageIdx];

    while (newMatchIdx < 0 || newMatchIdx > matchIdxList.length - 1) {
      pageIdx += delta;
      let mod = pageIdx % this.state.pagesCount; // mod can be negative
      pageIdx = mod >= 0 ? mod : this.state.pagesCount - Math.abs(mod);
      // if next: select first match (delta-1 = 0) in the next available pages
      // if prev: select last match (length-1) in the previous available pages
      matchIdxList = matches[pageIdx];
      newMatchIdx = delta > 0 ? 0 : matchIdxList.length - 1;
    }

    if (newMatchIdx < 0) newMatchIdx = 0;
    if (newMatchIdx > matchIdxList.length)
      newMatchIdx = matchIdxList.length - 1;

    this.pdfFindController.selected.pageIdx = pageIdx;
    this.pdfFindController.selected.matchIdx = newMatchIdx;
    this.changePageNumber(pageIdx + 1);
    this.eventBus.dispatch("updatetextlayermatches", {
      source: this.pdfFindController,
      pageIndex: pageIdx,
    });
  }

  /**
   * Scrolls the view to center on a specified annotation.
   * @param {string} annotId - The ID of the annotation to view.
   */
  scrollAnnotIntoView(annotId: string) {
    if (!!!annotId) return;
    let annot = this.annotStore.getById(annotId) as Annotation;
    // change number first in case the dom is not rendered
    this.changePageNumber(annot.data.pageNumber);
    annot.doms[0].scrollIntoView({
      block: "center",
      inline: "center",
    });
    nextTick(() => {
      this.annotStore.setActive(annotId);
    });
  }
}
