<template>
  <div class="q-pb-md">
    <ProgressDialog
      v-model="showProgressDialog"
      :progress="progress"
      :errors="errors"
    />

    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("theme") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          dense
          outlined
          square
          :options="themeOptions"
          :display-value="theme[0].toUpperCase() + theme.slice(1)"
          v-model="theme"
        >
          <template v-slot:option="scope">
            <q-item v-bind="scope.itemProps">
              <q-item-section>
                <q-item-label>
                  {{ scope.opt[0].toUpperCase() + scope.opt.slice(1) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-select>
      </q-card-section>
    </q-card>

    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("font") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div style="font-size: 1rem">
          {{ $t("font-size-fontsize-px", [fontSize]) }}
        </div>
        <q-slider
          class="col q-pl-md"
          :min="14"
          :max="25"
          markers
          snap
          v-model="fontSize"
        ></q-slider>
      </q-card-section>
    </q-card>

    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("language") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          dense
          outlined
          square
          v-model="language"
          :options="languageOptions"
        />
      </q-card-section>
    </q-card>

    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("storage") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          dense
          outlined
          square
          readonly
          input-style="cursor: pointer; font-size: 1rem"
          v-model="stateStore.settings.storagePath"
          @click="showFolderPicker"
        >
          <template v-slot:before>
            <div style="font-size: 1rem">{{ $t("storage-path") }}</div>
          </template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="row">
          <div class="text-h6">{{ $t("citation-key") }}</div>
          <q-btn
            class="q-ml-sm"
            unelevated
            square
            no-caps
            color="primary"
            :ripple="false"
            :label="$t('update-references')"
            @click="updateCiteKeys"
          ></q-btn>
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div
          v-for="(meta, index) in exampleMetas"
          :key="index"
        >
          {{ `Example${index + 1} -- ${citeKeyExample(meta)}` }}
        </div>
        <div class="row">
          <q-select
            dense
            outlined
            square
            :options="citeKeyPartKeyOptions"
            :display-value="$t(citeKeyPartKeys[0])"
            :option-label="(opt) => $t(opt)"
            v-model="citeKeyPartKeys[0]"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            square
            :options="citeKeyConnectorOptions"
            v-model="citeKeyConnector"
            :option-label="(opt) => opt.trim() || '(None)'"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            square
            :options="citeKeyPartKeyOptions"
            :display-value="$t(citeKeyPartKeys[1])"
            :option-label="(opt) => $t(opt)"
            v-model="citeKeyPartKeys[1]"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            square
            :options="citeKeyConnectorOptions"
            v-model="citeKeyConnector"
            :option-label="(opt) => opt.trim() || '(None)'"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            square
            :options="citeKeyPartKeyOptions"
            :display-value="$t(citeKeyPartKeys[2])"
            :option-label="(opt) => $t(opt)"
            v-model="citeKeyPartKeys[2]"
            @update:model-value="updateCiteKeyRule"
          />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import ProgressDialog from "./ProgressDialog.vue";
// db
import { db } from "src/backend/database";
import { useStateStore } from "src/stores/appState";
import { updateAppState } from "src/backend/appState";
import { changePath } from "src/backend/project/file";
import { getAllProjects } from "src/backend/project/project";
import { generateCiteKey } from "src/backend/project/meta";
import pluginManager from "src/backend/plugin";
import { homeDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";
import { Meta } from "src/backend/database";
// utils
import { useI18n } from "vue-i18n";
import { useQuasar } from "quasar";
const $q = useQuasar();

const stateStore = useStateStore();
const { locale, t } = useI18n({ useScope: "global" });

// progressDialog
const showProgressDialog = ref(false);
const errors = ref<Error[]>([]);
const progress = ref(0.0);

// options
const languageOptions = [
  { value: "en_US", label: "English (en_US)" },
  { value: "zh_CN", label: "中文 (zh_CN)" },
];
const themeOptions = ["dark", "light"];
const citeKeyPartKeyOptions = ["author", "title", "year"];
const citeKeyConnectorOptions = [" ", "_"];

// example metas
const exampleMetas = [
  {
    title: "A Long Title",
    author: [{ family: "Last", given: "First" }],
    issued: { "date-parts": [[2023]] },
  },
  {
    title: "A Long Title",
    author: [
      { family: "Last1", given: "First1" },
      { family: "Last2", given: "First2" },
    ],
    issued: { "date-parts": [[2023]] },
  },
  {
    title: "A Long Title",
    author: [
      { family: "Last1", given: "First1" },
      { family: "Last2", given: "First2" },
      { family: "Last3", given: "First3" },
    ],
    issued: { "date-parts": [[2023]] },
  },
] as Meta[];

const language = computed({
  get() {
    let result = languageOptions[0];
    for (let option of languageOptions) {
      if (option.value === stateStore.settings.language) {
        result = option;
      }
    }
    return result;
  },
  set(option: { value: string; label: string }) {
    locale.value = option.value;
    stateStore.changeLanguage(option.value);
  },
});

const theme = computed({
  get() {
    return stateStore.settings.theme;
  },
  set(option: string) {
    stateStore.changeTheme(option);
  },
});

const fontSize = computed({
  get() {
    return parseFloat(stateStore.settings.fontSize);
  },
  set(size: number) {
    stateStore.changeFontSize(size);
  },
});

// citeKeyRule = "author<connector>title<connector>year"
// stateStore.settings.citeKeyRule.split(/[^a-z]/) => ["author", "title", "year"]
const citeKeyPartKeys = reactive(
  stateStore.settings.citeKeyRule.split(/[^a-z]/)
);
// stateStore.settings.citeKeyRule.split(/[a-z]/).filter((s) => s) => [ connector, connector ]
const citeKeyConnector = ref(
  stateStore.settings.citeKeyRule.split(/[a-z]/).filter((s) => s)[0]
);

/*********************
 * Methods
 *********************/
async function showFolderPicker() {
  // let result = window.fileBrowser.showFolderPicker();
  let result = await open({
    directory: true,
    multiple: false,
    defaultPath: await homeDir(),
  });
  if (result !== undefined && result != null && !!result) {
    let storagePath = result as string; // do not update texts in label yet
    await changeStoragePath(storagePath);
  }
}

async function changeStoragePath(newStoragePath: string) {
  // update db
  let oldStoragePath = stateStore.settings.storagePath;
  stateStore.settings.storagePath = newStoragePath;
  await saveAppState();
  await db.setStoragePath(newStoragePath);
  await moveFiles(oldStoragePath, newStoragePath);
  pluginManager.changePath(newStoragePath);
  await pluginManager.reloadAll(); // reload plugins
}

async function moveFiles(oldPath: string, newPath: string) {
  // show progress bar
  showProgressDialog.value = true;
  errors.value = [];

  progress.value = 0.0;
  await changePath(oldPath, newPath);
  let interval = setInterval(() => {
    if (progress.value + 0.1 <= 1.0) progress.value += 0.1;
    else clearInterval(interval);
  }, 100);
}

function citeKeyExample(meta: Meta) {
  return `title: ${meta.title}, year: ${
    (meta.issued as { "date-parts": any })["date-parts"][0][0]
  }, authors: ${meta.author
    .map((name) => name.given + " " + name.family)
    .join(", ")} => ${generateCiteKey(meta, stateStore.settings.citeKeyRule)}`;
}

function updateCiteKeyRule() {
  stateStore.settings.citeKeyRule = citeKeyPartKeys.join(
    citeKeyConnector.value
  );
  saveAppState();
}

async function updateCiteKeys() {
  let projects = await getAllProjects();
  for (let project of projects)
    project["citation-key"] = generateCiteKey(
      project,
      stateStore.settings.citeKeyRule
    );
  await db.bulkDocs(projects);
  $q.notify(t("citation-keys-updated"));
}

async function saveAppState() {
  let state = stateStore.saveState();
  await updateAppState(state);
}
</script>

<style scoped>
.card {
  background: var(--color-settings-card-bkgd);
}
</style>
