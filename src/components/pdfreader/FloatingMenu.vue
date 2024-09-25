<template>
  <div
    class="menu"
    style="z-index: 100"
  >
    <div class="row items-center q-px-sm q-py-xs">
      <ColorPicker
        @selected="(color: string) => $emit('highlightText', color)"
      />
      <q-btn
        class="q-ml-sm"
        dense
        flat
        :ripple="false"
        size="md"
        padding="none"
        icon="content_copy"
        @click="copyText"
        data-cy="btn-copy"
      >
        <q-tooltip>{{ $t("copy") }}</q-tooltip>
      </q-btn>
<!-- 
      <q-btn
        class="q-ml-sm"
        dense
        flat
        :ripple="false"
        size="md"
        padding="none"
        icon="mdi-chat-question-outline"
        @click="explainText"
        data-cy="btn-copy"
      >
        <q-tooltip>{{ $t("explain") }}</q-tooltip>
      </q-btn> -->
      <q-btn
        class="q-ml-sm"
        dense
        flat
        :ripple="false"
        size="md"
        padding="none"
        icon="translate"
        @click="translateText"
        @close="handleClose"
        data-cy="btn-translate"
      >
        <q-tooltip>{{ $t("translate") }}</q-tooltip>
      </q-btn>
    </div>
    <div>
      <FloatingMenuView
        v-if="clickedTranslate"
        :text="floatingText"
      ></FloatingMenuView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { copyToClipboard } from "quasar";
import { Button, Component, View } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { useSettingStore } from "src/stores/settingStore";
import { Translate } from "translate";
import { ref, watchEffect } from "vue";
import ColorPicker from "./ColorPicker.vue";
import FloatingMenuView from "./FloatingMenuView.vue";
import { useProjectStore } from "src/stores/projectStore";
import { checkIfUploaded, uploadPDF } from "src/backend/conversationAgent";
import { is } from "cypress/types/bluebird";

defineEmits(["highlightText"]);

const settingStore = useSettingStore();
const projectStore = useProjectStore();
const pluginBtns = ref<Button[]>([]);
const pluginViews = ref<View[]>([]);
const clickedTranslate = ref(false);
const floatingText = ref("");

const props = defineProps({
  projectid: {
    type: String,
    required: true,
  },
});

/**
 * Copies the selected text to the clipboard.
 */
function copyText() {
  let selection = window.getSelection();
  if (selection) copyToClipboard(selection.toString());
}

/**
 * Explains the selected text.
 */
async function explainText() {
  const textToExplain = window.getSelection()?.toString();
  if (!textToExplain) return;
  console.log("PRoject", props.projectid);

  const isUploaded = checkIfUploaded(props.projectid, "reference");
  if (!(await isUploaded).status) {
    const check = await uploadPDF(props.projectid);
    if (!check.status) {
      console.log("Error uploading PDF");
      return;
    } else {
      console.log("PDF uploaded successfully FloatingMenu");
    }
  }
}

/**
 * Translates the selected text and updates the UI.
 */
async function translateText() {
  const textToTranslate = window.getSelection()?.toString();
  if (!textToTranslate) return;

  const translate = Translate({
    engine: settingStore.pdfTranslateEngine as "google" | "yandex" | "deepl",
    key:
      settingStore.pdfTranslateEngine === "google"
        ? ""
        : settingStore.pdfTranslateApiKey,
  });
  const translatedText = await translate(
    textToTranslate.replace(/-\n/g, ""),
    settingStore.pdfTranslateLanguage
  );
  floatingText.value = translatedText;
  clickedTranslate.value = true;
}

function handleClose() {
  clickedTranslate.value = false;
}

watchEffect(() => {
  pluginViews.value = pluginManager.getViews(Component.PDFMenu);
  const buttons = pluginManager.getButtons(Component.PDFMenu);
  pluginBtns.value = buttons;
});
</script>
