<template>
  <div class="q-pb-md">
    <q-card
      flat
      class="q-my-md card"
    >
      <q-card-section class="row justify-between">
        <div>
          <div class="text-h6">{{ $t("account") }}</div>
          <div v-if="accountStore.isAuthenticated">
            {{ $t("signed-in-as", { type: accountStore.user.email }) }}
          </div>
        </div>
        <div v-if="accountStore.isAuthenticated">
          <q-btn
            class="btn q-ml-sm"
            :ripple="false"
            no-caps
            @click="accountStore.signOut()"
          >
            {{ $t("sign-out") }}
          </q-btn>
        </div>
        <div v-else>
          <q-btn
            class="btn q-ml-sm"
            :ripple="false"
            no-caps
            @click="showAuthDialog()"
          >
            {{ $t("sign-in") }}
          </q-btn>
        </div>
      </q-card-section>
    </q-card>
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
          dropdown-icon="mdi-chevron-down"
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
          dropdown-icon="mdi-chevron-down"
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
        {{ $t("language") }}
        <q-select
          dense
          outlined
          dropdown-icon="mdi-chevron-down"
          map-options
          emit-value
          v-model="settingStore.pdfTranslateLanguage"
          :options="pdfTranslateOptions"
        />

        {{ $t("engine") }}
        <q-select
          dense
          outlined
          dropdown-icon="mdi-chevron-down"
          map-options
          emit-value
          v-model="settingStore.pdfTranslateEngine"
          :options="pdfTranslateEngineOptions"
        />

        API Key
        <q-input
          v-model="settingStore.pdfTranslateApiKey"
          :disable="settingStore.pdfTranslateEngine === 'google'"
          dense
          outlined
        />
      </q-card-section>
    </q-card>

    <q-card
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("display-translated-title") }}</div>
        <div>
          {{ $t("display-translated-title-info") }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-select
          dense
          outlined
          emit-value
          map-options
          dropdown-icon="mdi-chevron-down"
          v-model="settingStore.showTranslatedTitle"
          :options="titleTranslateOptions"
        />
      </q-card-section>
    </q-card>

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
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
// db
import { Config, Page, Project, db } from "src/backend/database";
import { getAllProjects } from "src/backend/project";
// utils
import { useQuasar } from "quasar";
import { generateCiteKey } from "src/backend/meta";
import { useAccountStore } from "src/stores/accountStore";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useSettingStore } from "src/stores/settingStore";
import { useI18n } from "vue-i18n";
import { authDialog, progressDialog } from "../dialogs/dialogController";
import CustomRuleModifier from "./CustomRuleModifier.vue";
const $q = useQuasar();

const settingStore = useSettingStore();
const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
const accountStore = useAccountStore();
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

/*********************
 * Methods
 *********************/

/**
 * Updates the citation keys for all projects in the database.
 * Utilizes the current citation key rule set in stateStore settings.
 * Notifies the user upon successful update.
 */
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

/**
 * Rename PDFs for all projects in the database.
 * Utilizes the pdfRenameRule set in stateStore settings.
 * Notifies the user upon successful update.
 */
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

/**
 * Update projectIds
 * Utilizes the projectIdRule set in stateStore settings.
 * Notifies the user upon successful update.
 */
async function updateProjectIds() {
  progressDialog.show();
  progressDialog.onConfirm(() => progressDialog.close());
  const projects = await getAllProjects();
  for (const [index, project] of projects.entries()) {
    const oldId = project._id;
    const newId = generateCiteKey(project, settingStore.projectIdRule);
    // update projectIds and openedProjectIds
    await projectStore.updateProject(oldId, {
      _id: newId,
    } as Project);
    // update pageIds
    await layoutStore.renamePage(oldId, {
      id: newId,
    } as Page);
    progressDialog.progress = (index + 1) / projects.length;
  }
  $q.notify(t("updated", { type: t("project") }));
}

/**
 * Show authentication dialog
 */
function showAuthDialog() {
  authDialog.authView = "signIn";
  authDialog.show();
  authDialog.onConfirm(() => {
    if (authDialog.authView === "signIn")
      accountStore.signIn(authDialog.email, authDialog.password);
    else if (authDialog.authView === "signUp")
      accountStore.signUp(authDialog.email, authDialog.password);
    else if (authDialog.authView === "forgetPassword")
      accountStore.resetPassword(authDialog.email);
    else if (authDialog.authView === "resetPassword")
      accountStore.updateUser({ password: authDialog.password });
  });
}
</script>
