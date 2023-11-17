<template>
  <div
    v-if="loading"
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
  <WelcomeCarousel
    v-else-if="showWelcomeCarousel"
    v-model="showWelcomeCarousel"
  />
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
  // once the welcome page is gone, show loading scene
  // and start to scan the storage path
  if (!showWelcomeCarousel.value) {
    loading.value = true;
    scanAndUpdateDB();
  }
});

watchEffect(() => {
  // loading scene will disappear when the scan is complete
  if (scanStatus.value === "done") loading.value = false;
});

onMounted(async () => {
  let state = await getAppState(); // if no storage path it returns default state
  stateStore.loadState(state);
  projectStore.loadOpenedProjects(state.openedProjectIds);

  // apply settings
  stateStore.changeTheme(stateStore.settings.theme);
  stateStore.changeFontSize(parseFloat(stateStore.settings.fontSize));
  stateStore.changeLanguage(stateStore.settings.language);
  locale.value = stateStore.settings.language;

  // if there is no path, show welcome carousel
  if (!(await db.getStoragePath())) {
    showWelcomeCarousel.value = true;
  } else {
    showWelcomeCarousel.value = false;
  }
});
</script>
