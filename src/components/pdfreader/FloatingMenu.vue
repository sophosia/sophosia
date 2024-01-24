<template>
  <div style="z-index: 100; max-width: 20vw">
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
import {
  Button,
  ComponentName,
  ToggleButton,
  View,
} from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { useStateStore } from "src/stores/stateStore";
import translate from "translate";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import ColorPicker from "./ColorPicker.vue";
import FloatingMenuView from "./FloatingMenuView.vue";

defineEmits(["highlightText"]);

const stateStore = useStateStore();
const pluginBtns = ref<Button[]>([]);
const pluginToggleBtns = ref<ToggleButton[]>([]);
const pluginViews = ref<View[]>([]);
const clickedTranslate = ref(false);
const floatingText = ref("");

const translateOptions = [
  { value: "en", label: "English (en)" },
  { value: "zh", label: "中文 (zh)" },
  { value: "hi", label: "हिन्दी (hi)" },
  { value: "es", label: "Español (es)" },
  { value: "fr", label: "Français (fr)" },
  { value: "ar", label: "العربية (ar)" },
  { value: "bn", label: "বাংলা (bn)" },
  { value: "ru", label: "Русский (ru)" },
  { value: "pt", label: "Português (pt)" },
  { value: "id", label: "Bahasa Indonesia (id)" },
  { value: "ur", label: "اردو (ur)" },
  { value: "de", label: "Deutsch (de)" },
  { value: "ja", label: "日本語 (ja)" },
  { value: "sw", label: "Kiswahili (sw)" },
  { value: "te", label: "తెలుగు (te)" },
  { value: "mr", label: "मराठी (mr)" },
  { value: "tr", label: "Türkçe (tr)" },
  { value: "ta", label: "தமிழ் (ta)" },
  { value: "vi", label: "Tiếng Việt (vi)" },
  { value: "ko", label: "한국어 (ko)" },
  { value: "fa", label: "فارسی (fa)" },
];

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
  let textToTranslate = window.getSelection()?.toString();
  const language = stateStore.settings.translateLanguage;
  let ln;
  for (let option of translateOptions) {
    if (option.label === language) {
      ln = option.value;
    }
  }
  if (textToTranslate && ln) {
    translate.engine = "google";
    const translatedText = await translate(
      textToTranslate.replace(/-\n/g, ""),
      ln
    );

    console.log(translatedText);
    floatingText.value = translatedText;
    clickedTranslate.value = true;
  }
}

function handleClose() {
  clickedTranslate.value = false;
}

watch(pluginManager.statusMap.value, (_) => {
  pluginViews.value = pluginManager.getViews(ComponentName.PDF_MENU);
  let buttons = pluginManager.getBtns(ComponentName.PDF_MENU);
  pluginBtns.value = buttons.btns;
  pluginToggleBtns.value = buttons.toggleBtns;
});

onMounted(() => {
  pluginViews.value = pluginManager.getViews(ComponentName.PDF_MENU);
  let buttons = pluginManager.getBtns(ComponentName.PDF_MENU);
  pluginBtns.value = buttons.btns;
});

onBeforeUnmount(() => {
  stateStore.togglePDFMenuView(false);
});
</script>
