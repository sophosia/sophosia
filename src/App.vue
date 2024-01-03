<template>
  <WelcomeCarousel
    v-if="stateStore.showWelcomeCarousel"
    v-model="stateStore.showWelcomeCarousel"
  />
  <div
    v-else-if="!isScanned"
    style="margin-top: 50vh"
    class="q-px-xl row justify-center"
  >
    <div class="text-h6">{{ $t("scaning") + "..." }}</div>
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
import WelcomeCarousel from "src/components/welcome/WelcomeCarousel.vue";
import { onMounted, ref, watchEffect } from "vue";
import { useStateStore } from "src/stores/appState";
import { useProjectStore } from "src/stores/projectStore";
import { useI18n } from "vue-i18n";
import { db } from "src/backend/database";
import { scanAndUpdateDB, isScanned } from "src/backend/project/scan";
const { locale } = useI18n({ useScope: "global" });
const stateStore = useStateStore();
const projectStore = useProjectStore();
// must determine the existence of storagePath before heading to MainLayout
const loading = ref(false);

watchEffect(async () => {
  // once the welcome page is gone
  // we need to load the app state
  // so the app doesn't overwrite the already existing app state
  // then we can start to scan the storage path and build indexeddb (for faster data retrieval)
  if (!stateStore.showWelcomeCarousel) {
    await stateStore.loadState();
    await projectStore.loadOpenedProjects(stateStore.openedProjectIds);
    scanAndUpdateDB();
  }
});

onMounted(async () => {
  if (process.env.PROD) {
    // disable default context menu
    // use ctrl+shift+i on window / linux, command+option+i on macos to open dev tool
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // try to load the storage path see if it exists
  await db.getConfig();

  // regardless of the existence of storagePath
  // we need to apply settings
  // if no storage path default state will be used
  await stateStore.loadState();
  await projectStore.loadOpenedProjects(stateStore.openedProjectIds);

  // apply settings
  stateStore.changeTheme(stateStore.settings.theme);
  stateStore.changeFontSize(parseFloat(stateStore.settings.fontSize));
  stateStore.changeLanguage(db.config.language);
  locale.value = db.config.language;

  // if there is no path, show welcome carousel
  if (!db.config.storagePath) {
    // showWelcomeCarousel.value = true;
    stateStore.toggleWelcome(true);
  } else {
    // showWelcomeCarousel.value = false;
    stateStore.toggleWelcome(false);
  }
});
</script>
