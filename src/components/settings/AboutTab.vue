<template>
  <div class="q-pb-md">
    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="row items-center justify-between">
          <div class="text-h6 row items-center">
            <q-icon
              name="img:icons/logo.svg"
              size="lg"
              alt="logo"
            />
            <div class="q-ml-sm">{{ `${$t("sophosia")} ${version}` }}</div>
          </div>
          <div>
            <q-btn
              v-if="!isUpdateAvailable"
              unelevated
              square
              :ripple="false"
              no-caps
              :label="$t('check-for-updates')"
              color="primary"
              @click="checkForUpdate"
            />
            <q-btn
              v-else
              unelevated
              square
              :ripple="false"
              no-caps
              :label="$t('download-updates')"
              color="primary"
              @click="downloadUpdate"
              :disable="disabled"
            />
          </div>
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div style="white-space: pre-wrap">{{ updateMsg }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  checkUpdate,
  installUpdate,
  onUpdaterEvent
} from "@tauri-apps/api/updater";
import { getVersion } from "@tauri-apps/api/app";
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

/**
 * Checks if an update is available for the application.
 * Updates the `updateMsg` and `isUpdateAvailable` properties based on the availability of a new update.
 */
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

/**
 * Initiates the download and installation of the available application update.
 * Updates the `updateMsg` during the installation process.
 */
async function downloadUpdate() {
  updateMsg.value = "Installing update";
  await installUpdate();
}
</script>
