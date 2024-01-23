<template>
  <q-card
    :style="style"
    bordered
    flat
    @dblclick="editing = true"
    class="annot-card"
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
            @copyId="
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
                  }](sophosia://open-item/${annot.data._id})`
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
        draggable="true"
        @dragstart="handleDragStart"
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
      >
        {{ annotContent }}
      </div>
    </div>
  </q-card>
</template>
<script setup lang="ts">
import { Annotation } from "src/backend/pdfannotation/annotations";
import { PropType, computed, inject, nextTick, ref } from "vue";

import AnnotMenu from "./AnnotMenu.vue";

import renderMathInElement from "katex/contrib/auto-render";
import "katex/dist/katex.min.css";
import { colors, copyToClipboard } from "quasar";
import { AnnotationData } from "src/backend/database";
import PDFApplication from "src/backend/pdfreader";
import { KEY_pdfApp } from "./injectKeys";
const { luminosity } = colors;

const props = defineProps({
  annot: { type: Object as PropType<Annotation>, required: true },
  style: { type: String, required: true },
});
const pdfApp = inject(KEY_pdfApp) as PDFApplication;

const editing = ref(false);
const mdContentDiv = ref();
const annotContent = computed({
  get() {
    liveRender();
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

async function liveRender() {
  await nextTick();
  if (mdContentDiv.value)
    renderMathInElement(mdContentDiv.value, {
      // customised options
      // • auto-render specific keys, e.g.:
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      // • rendering keys, e.g.:
      throwOnError: false,
    });
}

const changeColor = (color: string) => {
  pdfApp.annotStore?.update(props.annot.data._id, {
    color: color,
  } as AnnotationData);
};

const deleteAnnot = () => {
  pdfApp.annotStore?.delete(props.annot.data._id);
};

const handleDragStart = (event: DragEvent) => {
  if (event.dataTransfer) {
    const link = `[${props.annot.data.type.toLocaleUpperCase()} - page${
      props.annot.data.pageNumber
    }](sophosia://open-item/${props.annot.data._id})`;

    event.dataTransfer.setData("text/plain", link);
  }
};
</script>
<style scoped lang="scss">
.annot-card {
  min-width: 250px;
}
</style>
