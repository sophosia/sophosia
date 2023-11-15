<template>
  <div
    v-show="showEditor"
    ref="vditorDiv"
  ></div>
  <HoverPane
    :content="hoverContent"
    :data="hoverData"
    @clickLink="(e:MouseEvent, link:string) => clickLink(e,link)"
    ref="hoverPane"
  />
</template>
<script setup lang="ts">
// types
import { inject, nextTick, onMounted, ref, watch } from "vue";
import { Note, NoteType, Project, Edge, db } from "src/backend/database";
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
import { useProjectStore } from "src/stores/projectStore";
import { getForwardLinks, updateLinks } from "src/backend/project/graph";

const stateStore = useStateStore();
const { t } = useI18n({ useScope: "global" });
const bus = inject("bus") as EventBus;

const props = defineProps({
  noteId: { type: String, required: true },
  hasToolbar: { type: Boolean, required: true },
  data: { type: Object, required: false },
});

const noteId = ref(props.noteId); // noteId might change as user rename
const vditor = ref<Vditor | null>(null);
const vditorDiv = ref<HTMLElement | null>(null);
const showEditor = ref(false);
const hoverPane = ref();
const hoverContent = ref("");
// tells HoverPane the hovered project path prefix and the content to show
const hoverData = ref({ content: "" });
const projectStore = useProjectStore();
const links = ref<Edge[]>([]);

watch(
  () => stateStore.settings.theme,
  (theme: string) => {
    setTheme(theme);
  }
);

watch(
  () => projectStore.renamedNote,
  (note: Note) => {
    noteId.value = note._id;
  }
);

onMounted(async () => {
  if (!vditorDiv.value) return;
  links.value = await getForwardLinks(props.noteId);
  vditorDiv.value.setAttribute("id", `vditor-${props.noteId}`);
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
      { name: "export", tipPosition: "s" },
      "|",
      { name: "help", tipPosition: "s" },
    ];

  vditor.value = new Vditor("vditor-" + props.noteId, {
    height: "100%",
    mode: "ir",
    toolbarConfig: {
      pin: true,
    },
    cdn: "vditor", // the entire vditor folder is in public
    toolbar: toolbar,
    lang: stateStore.settings.language as keyof II18n,
    tab: "    ", // use 4 spaces as tab
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
    placeholder: t("live-markdown-editor-latex-supported"),
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
      setTheme(stateStore.settings.theme);
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
          uploadImage(props.noteId, file).then((uploaded) => {
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
  if (!vditor.value) return;
  let content = await loadNote(props.noteId);
  vditor.value.setValue(content);
}

async function _saveContent() {
  // save the content when it's blur
  // this will be called before unmount
  if (!vditor.value) return;
  let content = vditor.value.getValue();
  await saveNote(noteId.value, content);
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
      newLinks.push({ source: noteId.value, target: href });
    }
  }

  // compare to the recorded links, only save when different
  let linkIds = Array.from(new Set(links.value.map((link) => link.target)));
  let newLinkIds = Array.from(new Set(newLinks.map((link) => link.target)));
  if (!_.isEqual(linkIds, newLinkIds)) {
    // update indexeddb
    await updateLinks(noteId.value, newLinks);
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
  }
}
const changeLinks = debounce(_changeLinks, 50) as () => void;

async function clickLink(e: MouseEvent, link: string) {
  if (!vditor.value) return;
  e.stopImmediatePropagation(); // stop propagating the click event
  vditor.value.blur(); // save the content before jumping

  try {
    // valid external url, open it externally
    new URL(link);
    await open(link);
  } catch (error) {
    // we just want the document, both getProject or getNote are good
    try {
      const item = link.includes("/")
        ? ((await getNote(link)) as Note)
        : ((await getProject(link)) as Project);
      let id = item._id;
      let label = item.label;
      let type = item.dataType === "project" ? "ReaderPage" : "NotePage";
      stateStore.openPage({ id, type, label });
    } catch (error) {
      console.log(error);
    }
  }
}
async function hoverLink(linkNode: HTMLElement) {
  if (!hoverPane.value) return;
  let link = (
    linkNode.querySelector("span.vditor-ir__marker--link") as HTMLElement
  ).innerHTML;
  try {
    // valid external url, open it externally
    new URL(link);
  } catch (error) {
    // we just want the document, both getProject or getNote are good
    try {
      let item = null;
      if (link.includes("/")) item = (await getNote(link)) as Note;
      else item = (await getProject(link)) as Project;
      if (item.dataType === "project") {
        let lines = [
          `# ${item.title}`,
          `Author(s): ${authorToString(item.author)}`,
          "\n",
          `Abstract: ${item.abstract}`,
        ];
        hoverContent.value = lines.join("\n");
        hoverData.value.content = lines.join("\n");
      } else if (item.dataType === "note") {
        if (item.type === "excalidraw") {
          let lines = [
            "# Excalidraw note",
            `Belongs to: ${generateCiteKey(
              (await getProject(item.projectId)) as Project,
              "author-year-title",
              true
            )}`,
          ];
          hoverContent.value = lines.join("\n");
          hoverData.value.content = lines.join("\n");
        } else {
          let content = await loadNote(item._id);
          hoverContent.value = content;
          hoverData.value.content = content;
        }
      }

      // set position for hoverpane
      if (!vditorDiv.value) return;
      let rect = linkNode.getBoundingClientRect();
      let parentRect = vditorDiv.value.getBoundingClientRect();
      hoverPane.value.card.$el.style.left = `${rect.left - parentRect.left}px`;
      hoverPane.value.card.$el.style.top = `${rect.bottom - parentRect.top}px`;
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
    if (img.src.includes("http://localhost:9000")) {
      // doing this so image can be display in dev mode
      let relPath = img.src.replace("http://localhost:9000", "");
      img.src = convertFileSrc(
        await join(db.storagePath, ".sophosia", "image", relPath)
      );
    } else if (img.src.includes("tauri://localhost")) {
      // doing this so image can be display in production mode
      let relPath = img.src.replace("tauri://localhost", "");
      img.src = convertFileSrc(
        await join(db.storagePath, ".sophosia", "image", relPath)
      );
    }

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
        value: `[${generateCiteKey(project, "author-year-title")}](${
          project._id
        })`,
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
    console.log("projectId", projectId);
    if (label.toLowerCase().indexOf(key) > -1) {
      let parentProject = await getProject(projectId);
      let citeKey = projectId;
      if (parentProject) citeKey = generateCiteKey(parentProject);
      hints.push({
        value: `[${noteId}](${noteId})`,
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
<style lang="scss">
pre.vditor-reset {
  /* do not change padding after resizing */
  padding: 10px 35px !important;
}

.vditor-toolbar--pin {
  /* do this so that the toolbar does not block the golden dropdown tab lists*/
  z-index: 0;
}

.vditor-hint {
  max-width: 50%;
}

.vditor-reset img {
  max-width: 80%;
}
</style>
