<template>
  <q-toolbar
    style="white-space: nowrap"
    class="toolbar"
  >
    <!-- navigation -->
    <div data-cy="page-control">
      <input
        style="height: 1.5rem; width: 3rem"
        :value="pageLabel"
        @keydown.enter="(e: KeyboardEvent) => changePage((e.target as HTMLInputElement).value)"
      />
      <span v-if="pdfApp.pageLabels?.length > 0">
        {{
          " (" +
          pdfApp.state.currentPageNumber +
          " of " +
          pdfApp.state.pagesCount +
          ") "
        }}
      </span>
      <span v-else>
        {{ " of " + pdfApp.state.pagesCount }}
      </span>

      <q-btn
        flat
        size="1rem"
        padding="none"
        :ripple="false"
        icon="mdi-chevron-left"
        @click="pdfApp.jumpToPageHistory(-1)"
        :disable="pdfApp.pageHistoryIndex.value <= 0"
      >
        <q-tooltip>{{ $t("backward") }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        size="1rem"
        padding="none"
        :ripple="false"
        icon="mdi-chevron-right"
        @click="pdfApp.jumpToPageHistory(1)"
        :disable="
          !pdfApp.state.pageHistory ||
          pdfApp.pageHistoryIndex.value >= pdfApp.state.pageHistory.length - 1
        "
      >
        <q-tooltip>{{ $t("forward") }}</q-tooltip>
      </q-btn>
    </div>

    <!-- view options -->
    <ViewDropdownBtn
      :currentScale="pdfApp.state.currentScale"
      :spreadMode="pdfApp.state.spreadMode"
      :isFullscreen="isFullscreen"
      :darkMode="pdfApp.state.darkMode"
      @changeScale="(params) => pdfApp.changeScale(params)"
      @changeSpreadMode="(mode) => pdfApp.changeSpreadMode(mode)"
      @toggleFullscreen="toggleFullscreen"
      @toggleDarkMode="toggleDarkMode"
    />

    <q-space />

    <!-- tools -->
    <q-btn-toggle
      v-model="pdfApp.state.tool"
      :ripple="false"
      unelevated
      size="0.7rem"
      padding="xs"
      toggle-color="#474851"
      :options="[
        {
          value: AnnotationType.CURSOR,
          icon: 'mdi-cursor-text',
          slot: AnnotationType.CURSOR,
        },
        {
          value: AnnotationType.HIGHLIGHT,
          icon: 'mdi-marker',
          slot: AnnotationType.HIGHLIGHT,
        },
        {
          value: AnnotationType.UNDERLINE,
          icon: 'mdi-format-underline',
          slot: AnnotationType.UNDERLINE,
        },
        {
          value: AnnotationType.STRIKEOUT,
          icon: 'mdi-format-strikethrough',
          slot: AnnotationType.STRIKEOUT,
        },
        {
          value: AnnotationType.RECTANGLE,
          icon: 'mdi-rectangle',
          slot: AnnotationType.RECTANGLE,
        },
        {
          value: AnnotationType.COMMENT,
          icon: 'mdi-comment-text',
          slot: AnnotationType.COMMENT,
        },
        {
          value: AnnotationType.INK,
          slot: AnnotationType.INK,
        },
        {
          value: AnnotationType.ERASER,
          slot: AnnotationType.ERASER,
        },
      ]"
    >
      <template v-slot:cursor>
        <q-tooltip>{{ $t("cursor") }}</q-tooltip>
      </template>
      <template v-slot:highlight>
        <q-tooltip>{{ $t("highlight") }}</q-tooltip>
      </template>
      <template v-slot:underline>
        <q-tooltip>{{ $t("underline") }}</q-tooltip>
      </template>
      <template v-slot:strikeout>
        <q-tooltip>{{ $t("strikeout") }}</q-tooltip>
      </template>
      <template v-slot:rectangle>
        <q-tooltip>{{ $t("rectangle") }}</q-tooltip>
      </template>
      <template v-slot:comment>
        <q-tooltip>{{ $t("comment") }}</q-tooltip>
      </template>
      <template v-slot:ink>
        <InkDropdownBtn
          v-if="pdfApp.state.inkThickness"
          v-model:inkThickness="pdfApp.state.inkThickness"
          v-model:inkOpacity="pdfApp.state.inkOpacity"
          @setInkTool="pdfApp.changeTool(AnnotationType.INK)"
        />
      </template>
      <template v-slot:eraser>
        <EraserDropdownBtn
          v-if="pdfApp.state.eraserType"
          v-model:eraserType="(pdfApp.state.eraserType as EraserType)"
          v-model:eraserThickness="pdfApp.state.eraserThickness"
          @setEraserTool="pdfApp.changeTool(AnnotationType.ERASER)"
        />
      </template>
    </q-btn-toggle>

    <!-- color btn -->
    <q-btn
      class="q-ml-xs"
      :style="`background: ${pdfApp.state.color}`"
      :ripple="false"
      flat
      size="0.5rem"
    >
      <q-tooltip>{{ $t("color") }}</q-tooltip>
      <q-menu
        anchor="bottom middle"
        self="top middle"
      >
        <q-item
          dense
          style="width: 10rem"
        >
          <ColorPicker
            @selected="(color: string) => pdfApp.changeColor(color)"
          />
        </q-item>
      </q-menu>
    </q-btn>

    <q-space />

    <SearchDropdownBtn
      :matchesCount="pdfApp.matchesCount"
      @search="(params) => pdfApp.searchText(params)"
      @clear="pdfApp.searchText({ query: '' } as PDFSearch)"
      @changeMatch="(delta) => pdfApp.changeMatch(delta)"
    />
    <!-- right menu -->
    <q-btn
      flat
      dense
      square
      icon="mdi-format-list-bulleted"
      size="0.8rem"
      padding="none"
      :ripple="false"
      :color="showRightMenu ? 'primary' : ''"
      @click="$emit('update:showRightMenu', !showRightMenu)"
    >
      <q-tooltip>{{ $t("toggle-right-menu") }}</q-tooltip>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar";
import { AnnotationType, EraserType, PDFSearch } from "src/backend/database";
import PDFApplication from "src/backend/pdfreader";
import { useLayoutStore } from "src/stores/layoutStore";
import { computed, inject, ref } from "vue";
import { KEY_pdfApp } from "./injectKeys";

import ColorPicker from "./ColorPicker.vue";
import EraserDropdownBtn from "./EraserDropdownBtn.vue";
import InkDropdownBtn from "./InkDropdownBtn.vue";
import SearchDropdownBtn from "./SearchDropdownBtn.vue";
import ViewDropdownBtn from "./ViewDropdownBtn.vue";

const $q = useQuasar();
const layoutStore = useLayoutStore();

/**
 * Props, emits, data
 */
const props = defineProps({
  showRightMenu: { type: Boolean, required: true },
});
const emit = defineEmits(["update:showRightMenu"]);

const pdfApp = inject(KEY_pdfApp) as PDFApplication;

const isFullscreen = ref(false);

const pageLabel = computed(() => {
  let pageNumber = pdfApp.state.currentPageNumber;
  if (pdfApp.pageLabels?.length > 0) {
    return pdfApp.pageLabels[pageNumber - 1];
  } else {
    return pageNumber;
  }
});

/**
 * Changes the current page of the PDF document based on the provided page label.
 * If page labels are defined, it finds the corresponding page number; otherwise, it parses the label as a number.
 * @param {string} pageLabel - The label or number of the page to navigate to.
 */
function changePage(pageLabel: string) {
  let pageNumber = 1;
  if (pdfApp.pageLabels.length > 0) {
    // If pageLabels exists
    let pageIndex = pdfApp.pageLabels.indexOf(pageLabel);
    if (pageIndex === -1) return; // do nothing if not finding the label
    pageNumber = pageIndex + 1;
  } else {
    // If there are no pageLabels
    pageNumber = parseInt(pageLabel);
  }
  pdfApp.changePageNumber(pageNumber);
}

/**
 * Toggles the fullscreen mode of the PDF viewer.
 * Uses the Quasar framework's fullscreen utility to enter or exit fullscreen mode.
 */
async function toggleFullscreen() {
  if (isFullscreen.value) await $q.fullscreen.exit();
  else await $q.fullscreen.request();

  isFullscreen.value = !isFullscreen.value;
}

/**
 * Toggles the dark mode view of the PDF document.
 * Changes the appearance of the PDF viewer to a dark-themed view.
 */
async function toggleDarkMode() {
  pdfApp.changeViewMode(!pdfApp.state.darkMode);
}

defineExpose({ changePage, toggleDarkMode });
</script>
