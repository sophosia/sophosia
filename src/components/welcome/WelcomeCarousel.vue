<template>
  <q-splitter
    v-model="listWidth"
    :limits="[10, 30]"
  >
    <template v-slot:before>
      <WorkspaceList v-model="path" />
    </template>
    <template v-slot:after>
      <div
        v-if="modelValue"
        class="column justify-center items-center"
        style="height: 100vh"
      >
        <h2 data-cy="title">
          {{ $t("welcome") }}
          <q-icon class="q-ml-lg">
            <img
              src="icons/logo.svg"
              alt="logo"
            />
          </q-icon>
        </h2>
        <div></div>

        <div class="text-h5">
          {{ $t("select-a-folder-to-fill-up-your-knowledge") }}
        </div>
        <q-input
          style="width: 60%"
          dense
          outlined
          readonly
          v-model="path"
          @click="selectStoragePath()"
        >
          <template v-slot:append>
            <q-btn
              flat
              :ripple="false"
              :label="$t('browse')"
              @click="selectStoragePath()"
            />
          </template>
        </q-input>
        <q-select
          dense
          outlined
          class="q-mt-xl"
          v-model="language"
          :options="languageOptions"
          data-cy="language-select"
        />
        <q-btn
          unelevated
          :disable="!path"
          square
          :color="path ? 'primary' : 'grey'"
          size="xl"
          class="q-mt-xl"
          :ripple="false"
          :label="$t('start')"
          @click="start"
        />
      </div>
    </template>
  </q-splitter>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useStateStore } from "src/stores/appState";
import { useI18n } from "vue-i18n";
import { open } from "@tauri-apps/api/dialog";
import { basename, homeDir } from "@tauri-apps/api/path";
import { db } from "src/backend/database";
import WorkspaceList from "./WorkspaceList.vue";

const { locale } = useI18n({ useScope: "global" });

const props = defineProps({ modelValue: { type: Boolean, required: true } });
const emit = defineEmits(["update:modelValue", "updateAppState"]);

const stateStore = useStateStore();

const listWidth = ref(20);

const path = ref("");
const languageOptions = ref([
  { value: "en_US", label: "English (en_US)" },
  { value: "zh_CN", label: "中文 (zh_CN)" },
]);

const language = computed({
  get() {
    let result = null;
    for (let option of languageOptions.value) {
      if (option.value === stateStore.settings.language) {
        result = option;
      }
    }
    return result as { value: "en_US" | "zh_CN"; label: string };
  },
  set(option: { value: "en_US" | "zh_CN"; label: string }) {
    stateStore.settings.language = option.value;
    changeLanguage(option.value);
  },
});

function changeLanguage(language: "en_US" | "zh_CN") {
  locale.value = language;
  emit("updateAppState");
}

async function selectStoragePath() {
  const result = await open({
    directory: true,
    multiple: true,
    defaultPath: await homeDir(),
  });
  if (result !== undefined && result != null && !!result[0])
    path.value = result[0];
}

async function changeStoragePath() {
  await db.setStoragePath(path.value);
  await db.createHiddenFolders();
}

async function start() {
  await changeStoragePath();
  emit("update:modelValue", false);
}
</script>
