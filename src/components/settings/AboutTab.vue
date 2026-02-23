<template>
  <div class="about-section">
    <div class="about-header">
      <q-icon
        name="img:icons/logo.svg"
        size="lg"
        alt="logo"
      />
      <div class="about-title">{{ `${$t("sophosia")} ${version}` }}</div>
      <q-btn
        v-if="!isUpdateAvailable"
        class="btn q-ml-md"
        unelevated
        :ripple="false"
        no-caps
        :label="$t('check-for-updates')"
        @click="checkForUpdate"
      />
      <q-btn
        v-else
        unelevated
        class="btn q-ml-md"
        :ripple="false"
        no-caps
        :label="$t('download-updates')"
        @click="downloadUpdate"
        :disable="disabled"
      />
    </div>
    <div
      v-if="updateMsg"
      class="about-update-msg"
    >
      {{ updateMsg }}
    </div>
  </div>
</template>
<script setup lang="ts">
import { getVersion } from "@tauri-apps/api/app";
import {
  checkUpdate,
  installUpdate,
  onUpdaterEvent,
} from "@tauri-apps/api/updater";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n({ useScope: "global" });

const version = ref("v0.1.0");
const updateMsg = ref("");
const isUpdateAvailable = ref(false);
const disabled = ref(false);
const unlisten = ref();

onMounted(async () => {
  unlisten.value = await onUpdaterEvent(({ error, status }) => {
    if (error) {
      updateMsg.value = `Error: ${error}`;
      disabled.value = false; // allow user to try again
    } else {
      updateMsg.value = `Status: ${status}`;
      disabled.value = true; // the thing is already downloading
      if (status === "DONE") updateMsg.value += "\n" + t("relaunch-app");
    }
  });
  version.value = "v" + (await getVersion());
});

onBeforeUnmount(() => unlisten.value());

async function checkForUpdate() {
  updateMsg.value = t("check-for-updates");
  const update = await checkUpdate();
  isUpdateAvailable.value = update.shouldUpdate;
  if (!update.shouldUpdate) return;

  if (update.manifest)
    updateMsg.value = `${t("newer-version-available")}
${t("version", ["v" + update.manifest.version])}
${update.manifest.body}`;
}

async function downloadUpdate() {
  updateMsg.value = "Installing update";
  await installUpdate();
}
</script>
<style lang="scss" scoped>
.about-section {
  max-width: 600px;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.about-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--q-reg-text);
}

.about-update-msg {
  margin-top: 12px;
  font-size: 0.8125rem;
  color: var(--q-text-muted);
  white-space: pre-wrap;
  line-height: 1.5;
}
</style>
