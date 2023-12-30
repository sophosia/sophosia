<template>
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
</template>
<script setup lang="ts">
// types
import { inject, nextTick, onMounted, ref, watch } from "vue";
import {
  Note,
  NoteType,
  Project,
  Edge,
  db,
  AnnotationData,
} from "src/backend/database";
// vditor
import Vditor from "vditor";
import "src/css/vditor/index.css";
// db related
import { useStateStore } from "src/stores/appState";
import {
  loadNote,
  saveNote,
  getAllNotes,
  getNote,
  uploadImage,
} from "src/backend/project/note";

import { getAllProjects, getProject } from "src/backend/project/project";
// util
import { EventBus, debounce } from "quasar";
import { useI18n } from "vue-i18n";
import _ from "lodash";
import { authorToString } from "src/backend/project/utils";
import { generateCiteKey } from "src/backend/project/meta";
import { dirname, join, sep } from "@tauri-apps/api/path";

import HoverPane from "./HoverPane.vue";
import { open } from "@tauri-apps/api/shell";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { getForwardLinks, updateLinks } from "src/backend/project/graph";
import { isLinkUpdated } from "src/backend/project/scan";

const stateStore = useStateStore();
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
  () => stateStore.settings.theme,
  (theme: string) => {
    setTheme(theme);
  }
);

watch(isLinkUpdated, async () => {
  if (!isLinkUpdated.value) return;
  // load note again
  await setContent();
  changeLinks();
  handleImage();
  // set this to false and wait for next update
  isLinkUpdated.value = false;
});

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
function initEditor() {
  let toolbar = [] as (
    | {
        name: string;
        tipPosition?: string;
        tip?: string;
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
      { name: "upload", tipPosition: "s", tip: t("upload-image") },
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
    lang: stateStore.settings.language as keyof II18n,
    tab: "    ", // use 4 spaces as tab
    theme: stateStore.settings.theme === "dark" ? "dark" : "classic",
    preview: {
      theme: {
        current: stateStore.settings.theme,
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
    },
    blur: () => {
      saveContent();
    },
    input: () => {
      saveContent();
      changeLinks();
      handleImage();
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

function setTheme(theme: string) {
  // this is used to set code theme
  if (!!vditor.value) {
    vditor.value.setTheme(
      theme === "dark" ? "dark" : "classic",
      theme,
      theme === "dark" ? "native" : "emacs"
    );
  }

  stateStore.changeTheme(theme);
}

/*****************************************
 * Set and save content
 *****************************************/

async function setContent() {
  if (!vditor.value || (!props.noteId && !props.data?.path)) return;
  let content = await loadNote(props.noteId, props.data?.path);
  vditor.value.setValue(content);
}

async function _saveContent() {
  // save the content when it's blur
  // this will be called before unmount
  if (!vditor.value || !props.save) return;
  let content = vditor.value.getValue();
  await saveNote(props.noteId, content, props.data?.path);
  await saveLinks(); // only save links if it's a built-in note
}

const saveContent = debounce(_saveContent, 100) as () => void;

async function saveLinks() {
  if (!vditor.value) return;
  let newLinks = [] as Edge[]; // target ids

  let parser = new DOMParser();
  let html = parser.parseFromString(vditor.value.getHTML(), "text/html");
  let linkNodes = html.querySelectorAll("a");
  for (let node of linkNodes) {
    let href = (node as HTMLAnchorElement).getAttribute("href") as string;
    try {
      new URL(href);
      // this is a valid url, do nothing
    } catch (error) {
      // this is an invalid url, might be an id
      newLinks.push({ source: props.noteId, target: href });
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

async function clickLink(e: MouseEvent, link: string) {
  if (!vditor.value) return;
  e.stopImmediatePropagation(); // stop propagating the click event
  vditor.value.blur(); // save the content before jumping

  link = link.replace("sophosia://open-item/", ""); // ignore the deep link action
  try {
    // valid external url, open it externally
    new URL(link);
    await open(link);
  } catch (error) {
    link = link.replaceAll("%20", " "); // convert all %20 to spaces
    try {
      const item = link.includes("/")
        ? ((await getNote(link)) as Note)
        : ((await db.get(link)) as Project | AnnotationData);
      let id = "";
      let label = "";
      let type = "";
      let data = undefined;
      if (item.dataType === "project") {
        id = item._id;
        label = item.label;
        type = "ReaderPage";
      } else if (item.dataType === "note") {
        id = item._id;
        label = item.label;
        if (item.type === NoteType.EXCALIDRAW) type = "ExcalidrawPage";
        else type = "NotePage";
      } else if (item.dataType === "pdfAnnotation") {
        const project = (await getProject(item.projectId)) as Project;
        id = project._id;
        label = project?.label;
        type = "ReaderPage";
        data = { focusAnnotId: item._id };
      }
      stateStore.openPage({ id, type, label, data });
    } catch (error) {
      console.log(error);
    }
  }
}
async function hoverLink(linkNode: HTMLElement) {
  if (!hoverPane.value) return;
  // when hover on link, keep the hoverPane
  hoverPane.value.supposeToClose = false;
  let link = (
    linkNode.querySelector("span.vditor-ir__marker--link") as HTMLElement
  ).innerHTML;
  link = link.replace("sophosia://open-item/", ""); // ignore the deep link action
  try {
    // valid external url, open it externally
    new URL(link);
  } catch (error) {
    link = link.replaceAll("%20", " "); // convert all %20 to space
    try {
      let item = null;
      if (link.includes("/")) item = (await getNote(link)) as Note;
      else item = (await db.get(link)) as Project | AnnotationData;
      if (item.dataType === "project") {
        let lines = [
          `## ${item.title}`,
          `Author(s): ${authorToString(item.author)}`,
          `Abstract: ${item.abstract}`,
        ];
        hoverContent.value = lines.join("\n");
        hoverData.value.content = lines.join("\n");
      } else if (item.dataType === "note") {
        if (item.type === "excalidraw") {
          let lines = [
            `## ${item.label}`,
            `Belongs to: ${generateCiteKey(
              (await getProject(item.projectId)) as Project,
              "author_year_title",
              true
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
      } else if (item.dataType === "pdfAnnotation") {
        const project = (await getProject(item.projectId)) as Project;
        let lines = [
          `## ${item.type.toLocaleUpperCase()}`,
          `page: ${item.pageNumber}`,
          `project: ${project.label}`,
          `content:`,
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
// TODO: save image size
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
      [db.storagePath, ".sophosia", "image", imgFile].join(sep)
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
 * Return a filtered list of projects / notes according to key
 * @param key - keywords to filter
 */
async function filterHints(key: string) {
  let hints = [];
  let projects = (await getAllProjects()) as Project[];
  let noteIds = await getAllNotes();

  for (let project of projects) {
    if (project.title.toLowerCase().indexOf(key) > -1) {
      hints.push({
        value: `[${generateCiteKey(
          project,
          "author_year_title"
        )}](sophosia://open-item/${project._id})`,
        html: `
          <p style="font-size: 1rem" class="ellipsis q-my-none">
            <strong>Title</strong>: ${project.title}
          </p>
          <p class="ellipsis q-my-none">
            Author(s): ${authorToString(project.author)}
          </p>
          `,
      });
    }
  }

  for (let noteId of noteIds) {
    const splits = noteId.split("/");
    const label = splits[splits.length - 1];
    const projectId = splits[0];
    if (label.toLowerCase().indexOf(key) > -1) {
      let parentProject = await getProject(projectId);
      let citeKey = projectId;
      if (parentProject) citeKey = generateCiteKey(parentProject);
      // all spaces must be converted to %20, otherwise vditor won't render it
      hints.push({
        value: `[${noteId}](${noteId.replaceAll(" ", "%20")})`,
        html: `
          <p style="font-size: 1rem" class="ellipsis q-my-none">
            <strong>Note</strong>: ${label}
          </p>
          <p class="ellipsis q-my-none">
            Belongs to: ${parentProject?.label}
          </p>
          `,
      });
    }
  }
  return hints;
}
</script>
<style scoped lang="scss">
.highlight-editor {
  border: 2px dashed rgba($primary, 0.5);
}
</style>
