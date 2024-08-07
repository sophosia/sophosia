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
        size="sm"
        padding="none"
        icon="content_copy"
        @click="copyText"
        data-cy="btn-copy"
      >
        <q-tooltip>{{ $t("copy") }}</q-tooltip>
      </q-btn>
      <q-btn
        class="q-ml-sm"
        dense
        flat
        :ripple="false"
        size="sm"
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

defineEmits(["highlightText"]);

const settingStore = useSettingStore();
const pluginBtns = ref<Button[]>([]);
const pluginViews = ref<View[]>([]);
const clickedTranslate = ref(false);
const floatingText = ref("");

/**
 * Copies the selected text to the clipboard.
 */
function copyText() {
  let selection = window.getSelection();
  if (selection) copyToClipboard(selection.toString());
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
