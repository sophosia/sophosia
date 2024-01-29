<template>
  <div class="q-pb-md">
    <q-card
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("theme") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          class="selector"
          dense
          outlined
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
          v-model="language"
          :options="languageOptions"
        />
      </q-card-section>
    </q-card>

    <q-card
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("pdftranslate") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          dense
          outlined
          v-model="translate"
          :options="translateLabels"
        />
      </q-card-section>
    </q-card>

    <q-card
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="row">
          <div class="text-h6">{{ $t("citation-key") }}</div>
          <q-btn
            class="buttons q-ml-sm"
            unelevated
            no-caps
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
            :options="citeKeyPartKeyOptions"
            :display-value="$t(citeKeyPartKeys[0])"
            :option-label="(opt) => $t(opt)"
            v-model="citeKeyPartKeys[0]"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            :options="citeKeyConnectorOptions"
            v-model="citeKeyConnector"
            :option-label="(opt) => opt.trim() || '(None)'"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            :options="citeKeyPartKeyOptions"
            :display-value="$t(citeKeyPartKeys[1])"
            :option-label="(opt) => $t(opt)"
            v-model="citeKeyPartKeys[1]"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
            :options="citeKeyConnectorOptions"
            v-model="citeKeyConnector"
            :option-label="(opt) => opt.trim() || '(None)'"
            @update:model-value="updateCiteKeyRule"
          />
          <q-select
            dense
            outlined
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
// db
import { Config, Meta, db } from "src/backend/database";
import { generateCiteKey } from "src/backend/project/meta";
import { getAllProjects } from "src/backend/project/project";
// utils
import { useQuasar } from "quasar";
import { useSettingStore } from "src/stores/settingStore";
import { useI18n } from "vue-i18n";
const $q = useQuasar();

const settingStore = useSettingStore();
const { locale, t } = useI18n({ useScope: "global" });

// options
const languageOptions = [
  { value: "en_US", label: "English (en)" },
  { value: "zh_CN", label: "中文 (zh)" },
  { value: "fr_CA", label: "Français (fr)" },
];

const translateLabels = [
  "English (en)",
  "中文 (zh)",
  "हिन्दी (hi)",
  "Español (es)",
  "Français (fr)",
  "العربية (ar)",
  "বাংলা (bn)",
  "Русский (ru)",
  "Português (pt)",
  "Bahasa Indonesia (id)",
  "اردو (ur)",
  "Deutsch (de)",
  "日本語 (ja)",
  "Kiswahili (sw)",
  "తెలుగు (te)",
  "मराठी (mr)",
  "Türkçe (tr)",
  "தமிழ் (ta)",
  "Tiếng Việt (vi)",
  "한국어 (ko)",
  "فارسی (fa)",
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
      if (option.value === db.config.language) {
        result = option;
      }
    }
    return result;
  },
  set(option: { value: string; label: string }) {
    locale.value = option.value;
    db.setConfig({ language: option.value } as Config);
  },
});

const theme = computed({
  get() {
    return settingStore.theme;
  },
  set(option: string) {
    settingStore.changeTheme(option);
  },
});

const fontSize = computed({
  get() {
    return parseFloat(settingStore.fontSize);
  },
  set(size: number) {
    settingStore.changeFontSize(size);
  },
});

const translate = computed({
  get() {
    return settingStore.translateLanguage;
  },
  set(language: string) {
    settingStore.changeTranslate(language);
  },
});

// citeKeyRule = "author<connector>title<connector>year"
// settingStore.citeKeyRule.split(/[^a-z]/) => ["author", "title", "year"]
const citeKeyPartKeys = reactive(settingStore.citeKeyRule.split(/[^a-z]/));
// settingStore.citeKeyRule.split(/[a-z]/).filter((s) => s) => [ connector, connector ]
const citeKeyConnector = ref(
  settingStore.citeKeyRule.split(/[a-z]/).filter((s) => s)[0]
);

/*********************
 * Methods
 *********************/

/**
 * Generates an example citation key for a given metadata.
 * Utilizes the current citation key rule set in stateStore settings.
 * @param meta - The metadata object containing details like title, year, and authors.
 * @returns A string representing the example citation key.
 */
function citeKeyExample(meta: Meta) {
  return `title: ${meta.title}, year: ${
    (meta.issued as { "date-parts": any })["date-parts"][0][0]
  }, authors: ${meta.author
    .map((name) => name.given + " " + name.family)
    .join(", ")} => ${generateCiteKey(meta, settingStore.citeKeyRule)}`;
}

/**
 * Updates the citation key rule based on the user's selection of parts and connectors.
 * Saves the updated citation key rule in the application state.
 */
function updateCiteKeyRule() {
  settingStore.citeKeyRule = citeKeyPartKeys.join(citeKeyConnector.value);
}

/**
 * Updates the citation keys for all projects in the database.
 * Utilizes the current citation key rule set in stateStore settings.
 * Notifies the user upon successful update.
 */
async function updateCiteKeys() {
  let projects = await getAllProjects();
  for (let project of projects)
    project["citation-key"] = generateCiteKey(
      project,
      settingStore.citeKeyRule
    );
  await db.bulkDocs(projects);
  $q.notify(t("citation-keys-updated"));
}
</script>
