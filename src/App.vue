<template>
  <WelcomeCarousel
    v-if="showWelcomeCarousel"
    v-model="showWelcomeCarousel"
  />
  <div
    v-else-if="scanStatus !== 'done'"
    style="margin-top: 50vh"
    class="q-px-xl row justify-center"
  >
    <div class="text-h6">{{ $t(scanStatus) + "..." }}</div>
    <q-linear-progress
      v-if="loading"
      size="md"
      color="primary"
      indeterminate
    >
    </q-linear-progress>
  </div>
  <router-view v-else />
</template>

<script setup lang="ts">
import WelcomeCarousel from "src/components/WelcomeCarousel.vue";
import { onMounted, ref, watchEffect } from "vue";
import { getAppState } from "src/backend/appState";
import { useStateStore } from "src/stores/appState";
import { useProjectStore } from "src/stores/projectStore";
import { useI18n } from "vue-i18n";
import { db } from "src/backend/database";
import { scanStatus, scanAndUpdateDB } from "src/backend/project/scan";
const { locale } = useI18n({ useScope: "global" });
const stateStore = useStateStore();
const projectStore = useProjectStore();
// must determine the existence of storagePath before heading to MainLayout
const showWelcomeCarousel = ref(true);
const loading = ref(false);

watchEffect(() => {
  // once the welcome page is gone
  // start to scan the storage path
  if (!showWelcomeCarousel.value) scanAndUpdateDB();
});

onMounted(async () => {
  // try to load the storage path see if it exists
  await db.getStoragePath();

  // regardless of the existence of storagePath
  // we need to apply settings
  // if no storage path default state will be used
  let state = await getAppState();
  stateStore.loadState(state);
  projectStore.loadOpenedProjects(state.openedProjectIds);

  // apply settings
  stateStore.changeTheme(stateStore.settings.theme);
  stateStore.changeFontSize(parseFloat(stateStore.settings.fontSize));
  stateStore.changeLanguage(stateStore.settings.language);
  locale.value = stateStore.settings.language;

  // if there is no path, show welcome carousel
  if (!db.storagePath) {
    showWelcomeCarousel.value = true;
  } else {
    showWelcomeCarousel.value = false;
  }
});
</script>
