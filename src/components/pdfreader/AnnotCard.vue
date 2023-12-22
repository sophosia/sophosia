<template>
  <q-card
    :style="style"
    bordered
    flat
    @dblclick="editing = true"
  >
    <q-card-section
      :style="`background: ${annot.data.color}; ${
        isMovable ? 'cursor: move' : ''
      }`"
      class="q-py-none non-selectable"
    >
      <div
        :annot-card-id="annot.data._id"
        class="row justify-between items-center"
      >
        <div
          style="font-size: 1rem"
          class="q-mr-md text-white"
          :class="{ 'text-black': luminosity(annot.data.color) > 0.4 }"
        >
          {{
            annot.data.type.toUpperCase() + " - page" + annot.data.pageNumber
          }}
        </div>

        <q-btn
          dense
          flat
          padding="none"
          :ripple="false"
          icon="mdi-dots-vertical"
          :class="{ 'text-black': luminosity(annot.data.color) > 0.4 }"
          data-cy="btn-menu"
        >
          <AnnotMenu
            @changeColor="(color: string) => changeColor(color)"
            @deleteAnnot="deleteAnnot()"
            @copyID="
              () => {
                $q.notify($t('text-copied'));
                copyToClipboard(annot.data._id);
              }
            "
            @copyAsLink="
              () => {
                $q.notify($t('text-copied'));
                copyToClipboard(
                  `[${annot.data.type.toLocaleUpperCase()} - page${
                    annot.data.pageNumber
                  }](${annot.data._id})`
                );
              }
            "
            @scrollIntoView="pdfApp.scrollAnnotIntoView(annot.data._id)"
          />
        </q-btn>
      </div>
    </q-card-section>
    <div>
      <q-input
        v-if="editing"
        outlined
        square
        autogrow
        autofocus
        input-style="font-size: 1rem"
        v-model="annotContent"
        @blur="editing = false"
      />
      <div
        ref="mdContentDiv"
        style="
          font-size: 1rem;
          min-height: 5em;
          max-width: 50vw;
          max-height: 30vh;
          white-space: pre-wrap;
          overflow: auto;
          border: 0.1rem dashed grey;
        "
        class="q-ma-xs"
        data-cy="annot-content"
      ></div>
    </div>
  </q-card>
</template>
<script setup lang="ts">
import { ref, inject, PropType, computed, watchEffect, onMounted } from "vue";
import { Annotation } from "src/backend/pdfannotation/annotations";

import AnnotMenu from "./AnnotMenu.vue";

import { copyToClipboard, colors } from "quasar";
import {
  AnnotationData,
  Note,
  NoteType,
  Project,
  db,
} from "src/backend/database";
import PDFApplication from "src/backend/pdfreader";
import { KEY_pdfApp } from "./injectKeys";
import Vditor from "vditor/dist/method.min";
import { useStateStore } from "src/stores/appState";
import { getNote } from "src/backend/project/note";
import { getProject } from "src/backend/project/project";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { sep } from "@tauri-apps/api/path";
const { luminosity } = colors;
const stateStore = useStateStore();

const props = defineProps({
  annot: { type: Object as PropType<Annotation>, required: true },
  style: { type: String, required: true },
});
const pdfApp = inject(KEY_pdfApp) as PDFApplication;

const editing = ref(false);
const mdContentDiv = ref();
const annotContent = computed({
  get() {
    return props.annot.data.content;
  },
  set(text: string) {
    pdfApp.annotStore?.update(props.annot.data._id, {
      content: text,
    } as AnnotationData);
  },
});
const isMovable = ref(false);
defineExpose({ isMovable });

watchEffect(() => {
  if (mdContentDiv.value)
    Vditor.preview(mdContentDiv.value, annotContent.value, {
      theme: {
        current: stateStore.settings.theme,
        path: "vditor/dist/css/content-theme",
      },
      mode: stateStore.settings.theme,
      hljs: {
        lineNumber: true,
        style: "native",
      },
      after: () => {
        // remove <br> tags so that line space is correct
        (mdContentDiv.value as HTMLElement)
          .querySelectorAll("p > br")
          .forEach((el) => el.remove());
        changeLinks();
      },
      cdn: "vditor", // use local cdn
    });
});

const changeColor = (color: string) => {
  pdfApp.annotStore?.update(props.annot.data._id, {
    color: color,
  } as AnnotationData);
};

const deleteAnnot = () => {
  pdfApp.annotStore?.delete(props.annot.data._id);
};

function changeLinks() {
  if (!mdContentDiv.value) return;

  let linkNodes = mdContentDiv.value.querySelectorAll(
    "a"
  ) as NodeListOf<HTMLAnchorElement>;
  for (let linkNode of linkNodes) {
    linkNode.onclick = (e: MouseEvent) => {
      // do not open link winthin app
      e.preventDefault();
      let link = linkNode.href
        .replace("http://localhost:9000/", "") // in dev mode
        .replace("tauri://localhost/", ""); // in production mode
      for (let linkNode of linkNodes) {
        linkNode.onclick = async (e) => {
          e.preventDefault();
          try {
            // valid external url, open it externally
            new URL(link);
            open(link);
          } catch (error) {
            // we just want the document, both getProject or getNote are good
            try {
              const item = link.includes("/")
                ? ((await getNote(link)) as Note)
                : ((await getProject(link)) as Project);
              let id = item._id;
              let label = item.label;
              let type = "";
              if (item.dataType === "project") type = "ReaderPage";
              else if ((item as Project | Note).dataType === "note") {
                if (item.type === NoteType.EXCALIDRAW) type = "ExcalidrawPage";
                else type = "NotePage";
              }
              stateStore.openPage({ id, type, label });
            } catch (error) {
              console.log(error);
            }
          }
        };
      }
    };
  }

  let imageNodes = mdContentDiv.value.querySelectorAll(
    "img"
  ) as NodeListOf<HTMLImageElement>;
  for (let img of imageNodes) {
    if (
      !img.src.includes("http://localhost:9000/") &&
      !img.src.includes("tauri://localhost/")
    )
      continue;
    const imgFile = img.src
      .replace("http://localhost:9000/", "") // in dev mode
      .replace("tauri://localhost/", ""); // in production mode
    img.src = convertFileSrc(
      [db.storagePath, ".sophosia", "image", imgFile].join(sep)
    );
  }
}
</script>
