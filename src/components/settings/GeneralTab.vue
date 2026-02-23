<template>
  <div class="settings-sections">
    <div class="settings-section">
      <div class="section-title">{{ $t("theme") }}</div>
      <q-select
        class="section-input"
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
    </div>

    <div class="settings-section">
      <div class="section-title">{{ $t("font") }}</div>
      <div class="section-text">
        {{ $t("font-size-fontsize-px", [fontSize]) }}
      </div>
      <q-slider
        :min="14"
        :max="25"
        markers
        snap
        v-model="fontSize"
      />
    </div>

    <div class="settings-section">
      <div class="section-title">{{ $t("language") }}</div>
      <q-select
        class="section-input"
        dense
        outlined
        v-model="language"
        :options="languageOptions"
      />
    </div>

    <div class="settings-section">
      <div class="section-title">{{ $t("pdftranslate") }}</div>
      <div class="section-field">
        <label class="field-label">{{ $t("language") }}</label>
        <q-select
          class="section-input"
          dense
          outlined
          map-options
          emit-value
          v-model="settingStore.pdfTranslateLanguage"
          :options="pdfTranslateOptions"
        />
      </div>
      <div class="section-field">
        <label class="field-label">{{ $t("engine") }}</label>
        <q-select
          class="section-input"
          dense
          outlined
          map-options
          emit-value
          v-model="settingStore.pdfTranslateEngine"
          :options="pdfTranslateEngineOptions"
        />
      </div>
      <div class="section-field">
        <label class="field-label">API Key</label>
        <q-input
          class="section-input"
          v-model="settingStore.pdfTranslateApiKey"
          :disable="settingStore.pdfTranslateEngine === 'google'"
          dense
          outlined
        />
      </div>
    </div>

    <div class="settings-section">
      <div class="section-title">{{ $t("display-translated-title") }}</div>
      <div class="section-text">
        {{ $t("display-translated-title-info") }}
      </div>
      <q-select
        class="section-input"
        dense
        outlined
        emit-value
        map-options
        v-model="settingStore.showTranslatedTitle"
        :options="titleTranslateOptions"
      />
    </div>

    <CustomRuleModifier
      v-model:rule="settingStore.citeKeyRule"
      ruleType="citeKey"
      @bulkUpdate="updateCiteKeys"
    />

    <CustomRuleModifier
      v-model:rule="settingStore.pdfRenameRule"
      ruleType="pdfRename"
      @bulkUpdate="renamePDFs"
    />

    <CustomRuleModifier
      v-model:rule="settingStore.projectIdRule"
      ruleType="projectId"
      @bulkUpdate="updateProjectIds"
    />

    <IndexFileCard @indexFiles="onIndexFiles" />
  </div>
</template>
<script setup lang="ts">
import CustomRuleModifier from "./CustomRuleModifier.vue";
import IndexFileCard from "./IndexFileCard.vue";
import { computed } from "vue";
import { Config, Page, Project, db } from "src/backend/database";
import { getAllProjects } from "src/backend/project";
import { useQuasar } from "quasar";
import { generateCiteKey } from "src/backend/meta";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import { useI18n } from "vue-i18n";
import { progressDialog } from "../dialogs/dialogController";
import { indexFiles } from "src/backend/indexer";
const $q = useQuasar();

const settingStore = useSettingStore();
const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const { locale, t } = useI18n({ useScope: "global" });

// options
const languageOptions = [
  { value: "en_US", label: "English (en)" },
  { value: "zh_CN", label: "中文 (zh)" },
  { value: "fr_CA", label: "Français (fr)" },
];

const pdfTranslateEngineOptions = [
  { value: "google", label: "Google" },
  { value: "deepl", label: "DeepL" },
  { value: "yandex", label: "Yandex" },
];

const pdfTranslateOptions = [
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

const titleTranslateOptions = [
  { value: false, label: "False" },
  { value: true, label: "True" },
];

const themeOptions = ["dark", "light"];

const language = computed({
  get() {
    return (
      languageOptions.find((opt) => opt.value === db.config.language) ||
      languageOptions[0]
    );
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

async function updateCiteKeys() {
  progressDialog.show();
  progressDialog.onConfirm(() => progressDialog.close());
  let projects = await getAllProjects();
  for (const [index, project] of projects.entries()) {
    projectStore.updateProject(project._id, {
      "citation-key": generateCiteKey(project, settingStore.citeKeyRule),
    } as Project);
    progressDialog.progress = (index + 1) / projects.length;
  }
  $q.notify(t("updated", { type: t("citation-key") }));
}

async function renamePDFs() {
  progressDialog.show();
  progressDialog.onConfirm(() => progressDialog.close());
  const projects = await getAllProjects();
  for (const [index, project] of projects.entries()) {
    projectStore.renamePDF(project._id, settingStore.pdfRenameRule);
    progressDialog.progress = (index + 1) / projects.length;
  }
  $q.notify(t("updated", { type: "PDF" }));
}

async function updateProjectIds() {
  progressDialog.show();
  progressDialog.onConfirm(() => progressDialog.close());
  const projects = await getAllProjects();
  for (const [index, project] of projects.entries()) {
    const oldId = project._id;
    const newId = generateCiteKey(project, settingStore.projectIdRule);
    await projectStore.updateProject(oldId, {
      _id: newId,
    } as Project);
    await layoutStore.renamePage(oldId, {
      id: newId,
    } as Page);
    progressDialog.progress = (index + 1) / projects.length;
  }
  $q.notify(t("updated", { type: t("project") }));
}

async function onIndexFiles() {
  progressDialog.show();
  progressDialog.onConfirm(() => progressDialog.close());
  await indexFiles((progress) => {
    progressDialog.progress = progress;
  });
  await db.setConfig({ lastScanTime: Date.now() } as Config);
}
</script>
<style lang="scss" scoped>
.settings-sections {
  max-width: 600px;
}

.settings-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--q-border);

  &:first-child {
    padding-top: 0;
  }
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--q-reg-text);
  margin-bottom: 8px;
}

.section-text {
  font-size: 0.8125rem;
  color: var(--q-text-muted);
  margin-bottom: 8px;
}

.section-input {
  max-width: 320px;
}

.section-field {
  margin-bottom: 8px;
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--q-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}
</style>
