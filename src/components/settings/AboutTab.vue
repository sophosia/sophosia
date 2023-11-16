<template>
  <div class="q-pb-md">
    <q-card
      square
      bordered
      flat
      class="q-my-md card"
    >
      <q-card-section>
        <div class="text-h6 row items-center">
          <img
            src="~assets/logo.svg"
            alt="logo"
          />
          <div class="q-ml-sm">{{ $t("research-helper") }}</div>
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        {{ $t("version", [version]) }}
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
        <div>{{ updateStatus }}</div>
        <div>{{ updateMsg }}</div>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  checkUpdate,
  installUpdate,
  onUpdaterEvent,
} from "@tauri-apps/api/updater";
import { getVersion } from "@tauri-apps/api/app";

const version = ref("v0.1.0");
const updateMsg = ref("");
const updateStatus = ref("");
const isUpdateAvailable = ref(false);
const disabled = ref(false);
const unlisten = ref();

onMounted(async () => {
  unlisten.value = await onUpdaterEvent(({ error, status }) => {
    if (error) updateStatus.value = `Error, ${error}`;
    else updateStatus.value = `Status: ${status}`;
  });
  version.value = await getVersion();
  await checkForUpdate();
  console.log("unlisten", unlisten.value);
});

onBeforeUnmount(() => unlisten.value());

async function checkForUpdate() {
  updateMsg.value = "Checking update";
  const update = await checkUpdate();
  isUpdateAvailable.value = update.shouldUpdate;
  if (!update.shouldUpdate) {
    updateMsg.value = "Up to date";
    return;
  }
  updateMsg.value = "Newer version available\n";
  if (update.manifest)
    updateMsg.value += `
Version: ${update.manifest.version}
Date: ${update.manifest.date}
${update.manifest.body}`;
}

async function downloadUpdate() {
  updateMsg.value = "Installing update";
  await installUpdate();
}
</script>
<style scoped>
.card {
  background: var(--color-settings-card-bkgd);
}
</style>
