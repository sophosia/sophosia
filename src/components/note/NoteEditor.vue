<template>
  <!-- the outmost layer is to make the page drag and drop working -->
  <div style="height: 100%">
    <div
      v-show="showEditor"
      ref="vditorDiv"
      :id="`vditor-${props.noteId}`"
    ></div>
    <HoverPane
      v-show="hoverContent"
      :content="hoverContent"
      :data="hoverData"
      @clickLink="(e:MouseEvent, link:string) => clickLink(e,link)"
      ref="hoverPane"
    />
    <iframe
      style="display: none"
      id="vditorExportIframe"
    ></iframe>
  </div>
</template>
<script setup lang="ts">
// types
import { AnnotationData, Edge, Note, Project, db } from "src/backend/database";
import { inject, nextTick, onMounted, ref, watch } from "vue";
// vditor
import "src/css/vditor/index.css";
import Vditor from "vditor";
import { exportPDF } from "vditor/src/ts/export";
// db related
import {
  getAllNotes,
  getNote,
  loadNote,
  saveNote,
  uploadImage,
} from "src/backend/note";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";

import { getAllProjects, getProject } from "src/backend/project";
// util
import { sep } from "@tauri-apps/api/path";
import _ from "lodash";
import { EventBus, debounce } from "quasar";
import { generateCiteKey } from "src/backend/meta";
import {
  authorToString,
  getDataType,
  idToLink,
  linkToId,
} from "src/backend/utils";
import { useI18n } from "vue-i18n";

import { open } from "@tauri-apps/api/shell";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import Fuse from "fuse.js";
import { getForwardLinks, updateLinks } from "src/backend/graph";
import HoverPane from "./HoverPane.vue";

const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();
const { t } = useI18n({ useScope: "global" });
const bus = inject("bus") as EventBus;

const props = defineProps({
  noteId: { type: String, required: true },
  hasToolbar: { type: Boolean, required: true },
  data: { type: Object, required: false },
  save: { type: Boolean, required: true, default: true },
});
// noteId might change as user rename
// data.path won't change since it will be some special note
// content will be read/write to path
const vditor = ref<Vditor | null>(null);
const vditorDiv = ref<HTMLElement | null>(null);
const showEditor = ref(false);
const hoverPane = ref();
const hoverContent = ref("");
// tells HoverPane the hovered project path prefix and the content to show
const hoverData = ref({ content: "" });
const links = ref<Edge[]>([]);

watch(
  () => settingStore.theme,
  (theme: string) => {
    setTheme(theme);
  }
);

watch(
  () => projectStore.isNotesUpdated,
  async () => {
    if (!projectStore.isNotesUpdated) return;
    // load note again
    await setContent();
    changeLinks();
    handleImage();
    // set this to false and wait for next update
    projectStore.isNotesUpdated = false;
  }
);

onMounted(async () => {
  if (!vditorDiv.value) return;
  links.value = await getForwardLinks(props.noteId);
  showEditor.value = true;
  initEditor();
  await nextTick();
});

/************************************************
 * Initialization of vditor
 ************************************************/

/**
 * Initializes the Vditor editor with specified settings and custom toolbar.
 *
 * This function creates a new instance of Vditor and applies various configurations
 * based on the props and application state. It defines the toolbar, themes, language,
 * preview options, and other settings. It also handles custom actions like exporting
 * to PDF and uploading images.
 */
function initEditor() {
  let toolbar = [] as (
    | {
        name: string;
        tipPosition?: string;
        tip?: string;
        icon?: string;
        click?: () => void;
      }
    | "|"
  )[];
  if (props.hasToolbar)
    toolbar = [
      {
        name: "outline",
        tipPosition: "s",
      },
      "|",
      { name: "headings", tipPosition: "s" },
      { name: "bold", tipPosition: "s" },
      { name: "italic", tipPosition: "s" },
      "|",
      { name: "table", tipPosition: "s" },
      "|",
      {
        name: "upload",
        tipPosition: "s",
        tip: t("upload-image"),
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-card-image" viewBox="0 0 16 16">
                <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>
                <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54L1 12.5v-9a.5.5 0 0 1 .5-.5z"/>
              </svg>`,
      },
      "|",
      {
        name: "exportPDF",
        tipPosition: "s",
        tip: t("export", { type: "PDF" }),
        icon: `<svg id="vditor-icon-export" viewBox="0 0 32 32">
                <path d="M31.399 26.042h-2.202c-0.172 0-0.315 0.143-0.315 0.315v2.529h-25.769v-25.773h25.773v2.529c0 0.172 0.143 0.315 0.315 0.315h2.202c0.172 0 0.315-0.139 0.315-0.315v-4.1c0-0.696-0.561-1.256-1.256-1.256h-28.92c-0.696 0-1.256 0.561-1.256 1.256v28.916c0 0.696 0.561 1.256 1.256 1.256h28.916c0.696 0 1.256-0.561 1.256-1.256v-4.1c0-0.176-0.143-0.315-0.315-0.315zM32.16 15.742l-5.807-4.583c-0.217-0.172-0.532-0.016-0.532 0.258v3.11h-12.85c-0.18 0-0.327 0.147-0.327 0.327v2.292c0 0.18 0.147 0.327 0.327 0.327h12.85v3.11c0 0.274 0.319 0.43 0.532 0.258l5.807-4.583c0.077-0.060 0.126-0.153 0.126-0.258s-0.049-0.197-0.125-0.257l-0.001-0.001z"></path>
              </svg>`,
        click: () => {
          const Ivditor = vditor.value?.vditor;
          if (Ivditor) exportPDF(Ivditor);
        },
      },
    ];
  vditor.value = new Vditor("vditor-" + props.noteId, {
    height: "100%",
    mode: "ir",
    toolbarConfig: {
      pin: true,
    },
    // don't know why vditor import style sheets from cdn instead of node_module
    // we put the css in the public folder
    cdn: "vditor",
    toolbar: toolbar,
    lang: db.config.language as keyof II18n,
    tab: "    ", // use 4 spaces as tab
    theme: settingStore.theme === "dark" ? "dark" : "classic",
    preview: {
      theme: {
        current: settingStore.theme,
        path: "vditor/dist/css/content-theme",
      },
      math: {
        // able to use digit in inline math
        inlineDigit: true,
      },
      hljs: {
        // enable line number in code block
        lineNumber: true,
        style: "native",
      },
    },
    cache: {
      enable: false,
    },
    hint: {
      parse: false,
      delay: 200, // unit: ms
      extend: [
        {
          key: "[[",
          hint: filterHints,
        },
      ],
    },
    after: async () => {
      if (!showEditor.value) return;
      await setContent();
      changeLinks();
      handleImage();
      handleTable();
    },
    blur: () => {
      saveContent();
    },
    input: () => {
      changeLinks();
      handleImage();
      handleTable();
      saveContent();
    },
    keydown: (e) => {
      console.log(e);
      if (e.key === "Delete") {
        removeHighlightedCells();
        handleTable();
      }
      if (e.key.includes("Arrow")) {
        // remove table buttons temporary for better navigation
        removeTableButtons();
        handleTable();
      }
    },
    upload: {
      accept: "image/*",
      handler: (files: File[]): null => {
        for (let file of files) {
          uploadImage(file).then((uploaded) => {
            if (uploaded === undefined) return;
            if (!vditor.value) return;
            vditor.value.insertValue(
              `![${uploaded.imgName}](${uploaded.imgPath})`
            );
          });
        }
        return null;
      },
    },
  });
}

/**
 * Sets the theme for the Vditor editor.
 *
 * This function updates the theme of the Vditor editor based on the provided theme
 * name. It adjusts the code theme and the overall visual theme of the editor.
 *
 * @param {string} theme - The name of the theme to set (e.g., 'dark', 'classic').
 */
function setTheme(theme: string) {
  // this is used to set code theme
  if (!!vditor.value) {
    vditor.value.setTheme(
      theme === "dark" ? "dark" : "classic",
      theme,
      theme === "dark" ? "native" : "emacs"
    );
  }
}

/*****************************************
 * Set and save content
 *****************************************/

/**
 * Loads and sets the content in the Vditor editor.
 *
 * This function asynchronously loads the content from the backend using the note ID
 * or data path and sets this content in the Vditor editor.
 */
async function setContent() {
  if (!vditor.value || (!props.noteId && !props.data?.path)) return;
  let content = await loadNote(props.noteId, props.data?.path);
  vditor.value.setValue(content);
}

/**
 * Saves the current content from the Vditor editor.
 *
 * This function is used internally to save the content of the editor. It retrieves
 * the current content from the editor and saves it using the note ID. It also handles
 * saving link information.
 */
async function _saveContent() {
  // save the content when it's blur
  // this will be called before unmount
  if (!vditor.value || !props.save) return;
  let content = vditor.value.getValue();
  await saveNote(props.noteId, content, props.data?.path);
  await saveLinks(); // only save links if it's a built-in note
}

const saveContent = debounce(_saveContent, 100) as () => void;

/**
 * Saves link information related to the current note.
 *
 * This function extracts links from the current note content and updates the link
 * information in the database. It ensures that only new or updated links are saved,
 * optimizing database interactions.
 */
async function saveLinks() {
  if (!vditor.value) return;
  let newLinks = [] as Edge[]; // target ids

  let parser = new DOMParser();
  let html = parser.parseFromString(vditor.value.getHTML(), "text/html");
  let linkNodes = html.querySelectorAll("a");
  for (let node of linkNodes) {
    const link = (node as HTMLAnchorElement).getAttribute("href") as string;
    const targetId = linkToId(link);
    try {
      new URL(targetId);
      // this is a valid url, do nothing
    } catch (error) {
      // this is an invalid url, might be an id
      newLinks.push({ source: props.noteId, target: targetId });
    }
  }

  // compare to the recorded links, only save when different
  let linkIds = Array.from(new Set(links.value.map((link) => link.target)));
  let newLinkIds = Array.from(new Set(newLinks.map((link) => link.target)));
  if (!_.isEqual(linkIds, newLinkIds)) {
    // update indexeddb
    await updateLinks(props.noteId, newLinks);
    links.value = newLinks;
    // notify graphview to update
    bus.emit("updateGraph");
  }
}

/*****************************************
 * Modify the default click link behavior
 *****************************************/

/**
 * Modifies the default behavior of hyperlinks in the Vditor editor.
 *
 * This function customizes the click behavior of links within the editor. It sets
 * up click handlers for each link to open them externally or handle internal navigation.
 * It also sets up hover behavior to show additional information using the HoverPane component.
 */
function _changeLinks() {
  if (!vditorDiv.value) return;

  let linkNodes = vditorDiv.value.querySelectorAll(
    "[data-type='a']"
  ) as NodeListOf<HTMLElement>;
  for (let linkNode of linkNodes) {
    let link = (
      linkNode.querySelector("span.vditor-ir__marker--link") as HTMLSpanElement
    ).innerHTML;
    linkNode.onclick = (e) => clickLink(e, link);
    linkNode.onmouseover = () => hoverLink(linkNode);
    linkNode.onmouseleave = () => hoverPane.value.close();
  }
}
const changeLinks = debounce(_changeLinks, 50) as () => void;

/**
 * Handles click events on hyperlinks within the editor.
 *
 * This function intercepts click events on links to implement custom behavior. It
 * determines whether to open links externally or perform internal navigation based
 * on the link format.
 *
 * @param {MouseEvent} e - The mouse event associated with the click.
 * @param {string} link - The URL or identifier of the clicked link.
 */
async function clickLink(e: MouseEvent, link: string) {
  if (!vditor.value) return;
  e.stopImmediatePropagation(); // stop propagating the click event
  vditor.value.blur(); // save the content before jumping

  const targetId = linkToId(link);
  console.log("targetId", targetId);
  try {
    // valid external url, open it externally
    new URL(targetId);
    await open(targetId);
  } catch (error) {
    layoutStore.openItem(targetId);
  }
}

/**
 * Handles hover events over links to display additional information.
 *
 * This function is triggered when a user hovers over a link. It fetches and displays
 * related information in the HoverPane component, providing context like project or
 * note details.
 *
 * @param {HTMLElement} linkNode - The HTML element of the hovered link.
 */
async function hoverLink(linkNode: HTMLElement) {
  if (!hoverPane.value) return;
  // when hover on link, keep the hoverPane
  hoverPane.value.supposeToClose = false;
  let link = (
    linkNode.querySelector("span.vditor-ir__marker--link") as HTMLElement
  ).innerHTML;
  const targetId = linkToId(link);
  try {
    // valid external url, open it externally
    new URL(targetId);
  } catch (error) {
    try {
      const dataType = getDataType(targetId);
      if (dataType === "project") {
        const content = await loadNote(`${targetId}/${targetId}.md`);
        hoverContent.value = content;
        hoverData.value.content = content;
      } else if (dataType === "note") {
        const item = (await getNote(targetId)) as Note;
        if (item.type === "excalidraw") {
          let lines = [
            `## ${item.label}`,
            `Belongs to: ${generateCiteKey(
              (await getProject(item.projectId)) as Project,
              settingStore.citeKeyRule
            )}`,
          ];
          hoverContent.value = lines.join("\n");
          hoverData.value.content = lines.join("\n");
        } else {
          let content = await loadNote(item._id);
          content = `## ${item.label}\n${content}`;
          content = hoverContent.value = content;
          hoverData.value.content = content;
        }
      } else if (dataType === "pdfAnnotation") {
        const item = (await db.get(targetId)) as AnnotationData;
        const project = (await getProject(item.projectId)) as Project;
        let lines = [
          `#### ${item.type.toLocaleUpperCase()}`,
          `page: ${item.pageNumber}`,
          `project: ${project.label}`,
          "content:",
          item.content,
        ];
        hoverContent.value = lines.join("\n");
        hoverData.value.content = lines.join("\n");
      }

      // set position for hoverpane
      if (!vditorDiv.value) return;
      let rect = linkNode.getBoundingClientRect();
      let parentRect = vditorDiv.value.getBoundingClientRect();
      hoverPane.value.card.$el.style.left = `${rect.left - parentRect.left}px`;
      // default the hoverPane appears below the link
      hoverPane.value.card.$el.style.top = `${rect.bottom - parentRect.top}px`;
      if (rect.bottom + 0.5 * parentRect.height > parentRect.bottom) {
        // if the hoverPane is below the bottom, we place it above the link
        hoverPane.value.card.$el.style.top = "";
        hoverPane.value.card.$el.style.bottom = `${
          parentRect.bottom - rect.top
        }px`;
      }
      hoverPane.value.card.$el.hidden = false;
    } catch (error) {
      console.log(error);
    }
  }
}

/********************************************
 * Add image resize handle on each image in the note
 ********************************************/

/**
 * Adds interactive resize handles to images in the note content.
 *
 * This function goes through all images in the note content and adds a drag handle
 * to each for resizing. It ensures that only images from certain sources are processed
 * and avoids adding multiple handles to the same image.
 */
async function _hangleImage() {
  if (!vditorDiv.value) return;
  let imgs = vditorDiv.value.querySelectorAll("img");
  for (let img of imgs) {
    if (
      !img.src.includes("http://localhost:9000/") &&
      !img.src.includes("tauri://localhost/") &&
      !img.src.includes("https://tauri.localhost/")
    )
      continue;
    const imgFile = img.src
      .replace("http://localhost:9000/", "") // in dev mode
      .replace("tauri://localhost/", "") // in production mode, mac, linux
      .replace("https://tauri.localhost/", ""); // in production mode, windows
    img.src = convertFileSrc(
      [db.config.storagePath, ".sophosia", "image", imgFile].join(sep)
    );

    let p = img.parentElement?.parentElement;
    if (!!!p || !!p.onmouseover) continue;
    // add this only if the image does not have it
    p.onmouseenter = () => {
      let dragHandle = document.createElement("div");
      dragHandle.style.backgroundColor = "grey";
      dragHandle.style.position = "relative";
      dragHandle.style.display = "inline-block";
      dragHandle.style.borderRadius = `${10}px`;
      dragHandle.style.top = `${-img.height / 3}px`;
      dragHandle.style.left = `${-0.05 * img.width}px`;
      dragHandle.style.width = `${5}px`;
      dragHandle.style.height = `${img.height / 3}px`;
      dragHandle.style.zIndex = "10000";
      dragHandle.style.cursor = "ew-resize";

      dragHandle.onmousedown = (e) => {
        e.preventDefault();
        let widthStart = img.width;
        let heightStart = img.height;
        let xStart = e.clientX;
        let ratio = img.height / img.width;

        document.onmousemove = (ev) => {
          let dx = ev.clientX - xStart;
          let dy = ratio * dx;

          img.width = widthStart + dx;
          img.height = heightStart + dy;

          dragHandle.style.top = `${-img.height / 3}px`;
          dragHandle.style.left = `${-0.05 * img.width}px`;
          dragHandle.style.height = `${img.height / 3}px`;
        };

        document.onmouseup = (e) => {
          document.onmousemove = null;
          document.onmouseup = null;
        };
      };
      (p as HTMLElement).append(dragHandle);

      (p as HTMLElement).onmouseleave = () => {
        dragHandle.remove();
      };
    };
  }
}
const handleImage = debounce(_hangleImage, 50) as () => void;

/*******************************************
 * Hints
 *******************************************/

/**
 * Filters and returns filtered lists of projects/note hints for the Vditor editor.
 *
 * This function is used to provide suggestions for link insertion within the editor.
 * It searches through projects and notes based on the provided keyword and returns
 * a list of matching hints with custom HTML formatting.
 *
 * @param {string} key - The keyword used for filtering suggestions.
 * @returns {Promise<Array>} A promise that resolves to an array of hint objects.
 */
async function filterHints(
  key: string
): Promise<Array<{ value: string; html: string }>> {
  const hints = [];
  const projects = (await getAllProjects()) as Project[];
  const noteIds = await getAllNotes();
  for (const project of projects) {
    project.authorString = authorToString(project.author);
    project.year = project.issued?.["date-parts"];
    project.tagString = project.tags.join(" ");
  }
  const notes = [] as Note[];
  for (const noteId of noteIds) {
    notes.push((await getNote(noteId)) as Note);
  }

  const items = projects.concat(notes as any);
  const fuse = new Fuse(items, {
    includeMatches: true,
    threshold: 0.6,
    keys: [
      "_id",
      "type",
      "title",
      "author.family",
      "author.given",
      "author.literal",
      "original-title",
      "abstract",
      "DOI",
      "ISBN",
      "ISSN",
      "publisher",
      "container-title",
      "path",
      "citation-key",
      "issued.data-parts",
      "tags",
    ],
  });

  const results = fuse.search(key);

  for (const result of results) {
    const item = result.item;
    if (item.dataType === "project") {
      hints.push({
        value: `[${generateCiteKey(
          item,
          settingStore.citeKeyRule
        )}](sophosia://open-item/${item._id})`,
        html: `
          <p style="font-size: 1rem" class="ellipsis q-my-none">
            <strong>Title</strong>: ${item.title}
          </p>
          <p class="ellipsis q-my-none">
            Author(s): ${authorToString(item.author)}
          </p>
          `,
      });
    } else if (item.dataType === "note") {
      hints.push({
        value: `[${item._id}](${idToLink(item._id)})`,
        html: `
          <p style="font-size: 1rem" class="ellipsis q-my-none">
            <strong>Note</strong>: ${item.label}
          </p>
          <p class="ellipsis q-my-none">
            Belongs to: ${item.projectId}
          </p>
          `,
      });
    }
  }
  return hints;
}

function _handleTable() {
  const container = vditor.value?.vditor.ir?.element;
  if (!container) return;
  const tables = container.querySelectorAll("table");
  for (const table of tables) {
    const header = table.tHead!;
    const tbody = table.tBodies[0];
    const rows = Array.from(table.rows);
    // add right button after last col
    table.style.position = "relative";
    table.onmousedown = () => {
      table
        .querySelectorAll(".highlighted-cell")
        .forEach((cell) => cell.classList.remove("highlighted-cell"));
    };

    // buttons
    let rightButton = table.querySelector<HTMLDivElement>(".right-button");
    if (rightButton) rightButton.remove();
    rightButton = document.createElement("div");
    rightButton.style.position = "absolute";
    rightButton.style.fontSize = "1.5rem";
    rightButton.style.top = `${header.offsetTop}px`;
    rightButton.style.left = `${
      header.clientWidth + 1.5 * parseFloat(settingStore.fontSize)
    }px`;
    rightButton.style.width = "1.5rem";
    rightButton.style.height = `${tbody.clientHeight + header.clientHeight}px`;
    rightButton.style.opacity = "0";
    rightButton.style.cursor = "pointer";
    rightButton.style.display = "flex";
    rightButton.style.alignItems = "center";
    rightButton.style.border = "1px solid var(--q-reg-text)";
    rightButton.classList.add("right-button");
    rightButton.classList.add("mdi");
    rightButton.classList.add("mdi-plus");
    rightButton.onmouseenter = () => (rightButton!.style.opacity = "1");
    rightButton.onmouseleave = () => (rightButton!.style.opacity = "0");
    rightButton.onclick = () => {
      insertCol(table);
      _handleTable();
    };
    table.insertAdjacentElement("afterbegin", rightButton);
    // add button after last row
    let bottomButton = table.querySelector<HTMLDivElement>(".bottom-button");
    if (bottomButton) bottomButton.remove();
    bottomButton = document.createElement("div");
    bottomButton.style.position = "absolute";
    bottomButton.style.top = "100%";
    bottomButton.style.width = `${header.clientWidth}px`;
    bottomButton.style.fontSize = "1.5rem";
    bottomButton.style.lineHeight = "1.5rem";
    bottomButton.style.cursor = "pointer";
    bottomButton.style.opacity = "0";
    bottomButton.style.border = "1px solid var(--q-reg-text)";
    bottomButton.style.display = "flex";
    bottomButton.style.justifyContent = "center";
    bottomButton.classList.add("bottom-button");
    bottomButton.classList.add("mdi");
    bottomButton.classList.add("mdi-plus");
    bottomButton.onmouseenter = () => (bottomButton!.style.opacity = "1");
    bottomButton.onmouseleave = () => (bottomButton!.style.opacity = "0");
    bottomButton.onclick = () => {
      insertRow(table);
      vditor.value?.insertValue("#"); // hadle flying cursor
      _handleTable();
    };
    table.insertAdjacentElement("afterbegin", bottomButton);

    let topLeftButton = table.querySelector<HTMLDivElement>(".top-left-button");
    if (topLeftButton) topLeftButton.remove();
    topLeftButton = document.createElement("div");
    topLeftButton.style.position = "absolute";
    topLeftButton.style.top = "0";
    topLeftButton.style.left = "0";
    topLeftButton.style.width = `${header.clientWidth}px`;
    topLeftButton.style.fontSize = "1.5rem";
    topLeftButton.style.lineHeight = "1.5rem";
    topLeftButton.style.cursor = "pointer";
    topLeftButton.style.opacity = "0";
    topLeftButton.style.color = "red";
    topLeftButton.classList.add("top-left-button");
    topLeftButton.classList.add("mdi");
    topLeftButton.classList.add("mdi-close");
    topLeftButton.onmouseenter = () => (topLeftButton!.style.opacity = "1");
    topLeftButton.onmouseleave = () => (topLeftButton!.style.opacity = "0");
    topLeftButton.onclick = () => table.remove();
    table.insertAdjacentElement("afterbegin", topLeftButton);

    for (const row of rows) {
      for (const cell of row.cells) {
        const [i, j] = [row.rowIndex, cell.cellIndex];
        // the following positions are relative to the cell
        cell.style.position = "relative";
        // drag handler on top of each header cell
        if (i === 0) {
          let topButton = cell.querySelector<HTMLDivElement>(".top-button");
          if (!topButton) {
            topButton = document.createElement("div");
            topButton.style.position = "absolute";
            topButton.style.left = "0";
            topButton.style.width = `${cell.clientWidth}px`;
            topButton.style.transform = "translateY(-100%)";
            topButton.style.opacity = "0";
            topButton.style.cursor = "grab";
            topButton.style.fontSize = "1.5rem";
            topButton.classList.add("top-button");
            topButton.classList.add("mdi");
            topButton.classList.add("mdi-drag-horizontal");
            topButton.onmouseenter = () => (topButton!.style.opacity = "1");
            topButton.onmouseleave = () => (topButton!.style.opacity = "0");
            topButton.onclick = () => {
              for (const _row of rows) {
                for (const _cell of _row.cells) {
                  if (_cell.cellIndex === j)
                    _cell.classList.add("highlighted-cell");
                }
              }
            };
            topButton.draggable = true;
            topButton.ondragstart = (e) => {
              e.dataTransfer?.setData("tableDraggedCellIndex", j.toString());
            };
            topButton.ondragover = (e) => {
              e.preventDefault();
              for (const _row of rows) {
                const overedCell = _row.cells[cell.cellIndex];
                overedCell.style.outline = "2px solid var(--q-primary)";
              }
            };
            topButton.ondragleave = (e) => {
              for (const _row of rows) {
                const overedCell = _row.cells[cell.cellIndex];
                overedCell.style.outline = "";
              }
            };
            topButton.ondrop = (e) => {
              const draggedCellIndex = parseInt(
                e.dataTransfer?.getData("tableDraggedCellIndex")!
              );
              const droppedCellIndex = cell.cellIndex;
              for (const _row of rows) {
                for (const _cell of _row.cells) {
                  _cell.style.outline = "";
                }
              }
              swapCol(table, draggedCellIndex, droppedCellIndex);
              _handleTable();
            };
            cell.insertAdjacentElement("afterbegin", topButton);
          }
        }

        // drag handler in front of first col
        if (j === 0) {
          let leftButton = row.querySelector<HTMLDivElement>(".left-button");
          if (!leftButton) {
            leftButton = document.createElement("div");
            leftButton.style.position = "absolute";
            leftButton.style.transform = "translateX(-100%)";
            leftButton.style.height = `${cell.clientHeight}px`;
            leftButton.style.opacity = "0";
            leftButton.style.cursor = "grab";
            leftButton.style.fontSize = "1.5rem";
            leftButton.classList.add("left-button");
            leftButton.classList.add("mdi");
            leftButton.classList.add("mdi-drag-vertical");
            leftButton.onmouseenter = () => (leftButton!.style.opacity = "1");
            leftButton.onmouseleave = () => (leftButton!.style.opacity = "0");
            leftButton.onclick = () => {
              for (const _row of rows) {
                for (const _cell of _row.cells) {
                  if (_row.rowIndex === i)
                    _cell.classList.add("highlighted-cell");
                }
              }
            };
            leftButton.draggable = true;
            leftButton.ondragstart = (e) => {
              e.dataTransfer?.setData("tableDraggedRowIndex", i.toString());
            };
            leftButton.ondragover = (e) => {
              e.preventDefault();
              for (const _cell of row.cells) {
                _cell.style.outline = "2px solid var(--q-primary)";
              }
            };
            leftButton.ondragleave = (e) => {
              for (const _cell of row.cells) {
                _cell.style.outline = "";
              }
            };
            leftButton.ondrop = (e) => {
              const draggedRowIndex = parseInt(
                e.dataTransfer?.getData("tableDraggedRowIndex")!
              );
              const droppedRowIndex = i;
              for (const _row of rows) {
                for (const _cell of _row.cells) {
                  _cell.style.outline = "";
                }
              }
              swapRow(table, draggedRowIndex, droppedRowIndex);
              _handleTable();
            };
            cell.insertAdjacentElement("beforebegin", leftButton);
          }
        }
      }
    }
  }
}

const handleTable = debounce(_handleTable, 200);

function insertRow(table: HTMLTableElement) {
  const lastRow = table.rows[table.rows.length - 1];
  const tr = document.createElement("tr");
  for (let i = 0; i < lastRow.cells.length; i++) {
    const td = document.createElement("td");
    td.style.position = "relative";
    tr.append(td);
  }
  lastRow.insertAdjacentElement("afterend", tr);
}

function insertCol(table: HTMLTableElement) {
  const rows = table.rows;
  for (const row of rows) {
    let cell = null;
    if (row.rowIndex === 0) {
      cell = document.createElement("th");
      cell.innerText = "New col";
    } else {
      cell = document.createElement("td");
    }
    row.insertAdjacentElement("beforeend", cell);
  }
}

function swapRow(
  table: HTMLTableElement,
  rowIndex1: number,
  rowIndex2: number
) {
  const rows = table.rows;
  const row1Vals = Array.from(rows[rowIndex1].cells).map(
    (cell) => cell.innerText
  );
  const row2Vals = Array.from(rows[rowIndex2].cells).map(
    (cell) => cell.innerText
  );
  for (let j = 0; j < row1Vals.length; j++) {
    console.log("val", row2Vals[j]);
    rows[rowIndex1].cells.item(j)!.innerText = row2Vals[j];
    rows[rowIndex2].cells.item(j)!.innerText = row1Vals[j];
  }
}

function swapCol(
  table: HTMLTableElement,
  colIndex1: number,
  colIndex2: number
) {
  const rows = table.rows;
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].cells;
    const temp = cells[colIndex1].innerText;
    cells[colIndex1].innerText = cells[colIndex2].innerText;
    cells[colIndex2].innerText = temp;
  }
}

function removeHighlightedCells() {
  if (!vditor.value) return [];
  const container = vditor.value.vditor.element;
  container
    .querySelectorAll(".highlighted-cell")
    .forEach((cell) => cell.remove());
}

function removeTableButtons() {
  if (!vditorDiv.value) return;
  vditorDiv.value
    .querySelectorAll("div[class*=-button]")
    .forEach((btn) => btn.remove());
}
</script>
