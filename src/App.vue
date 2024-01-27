<template>
  <DialogContainer />
  <WelcomeCarousel
    v-if="layoutStore.showWelcomeCarousel"
    v-model="layoutStore.showWelcomeCarousel"
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
import { db } from "src/backend/database";
import { isScanned, scanAndUpdateDB } from "src/backend/project/scan";
import WelcomeCarousel from "src/components/welcome/WelcomeCarousel.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useStateStore } from "src/stores/stateStore";
import { onMounted, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import DialogContainer from "./components/dialogs/DialogContainer.vue";
const { locale } = useI18n({ useScope: "global" });
const stateStore = useStateStore();
const projectStore = useProjectStore();
const layoutStore = useLayoutStore();
// must determine the existence of storagePath before heading to MainLayout
const loading = ref(false);

watchEffect(async () => {
  // once the welcome page is gone
  // we need to load the app state
  // so the app doesn't overwrite the already existing app state
  // then we can start to scan the storage path and build indexeddb (for faster data retrieval)
  if (!layoutStore.showWelcomeCarousel) {
    await stateStore.loadState();
    await projectStore.loadOpenedProjects(stateStore.openedProjectIds);
    scanAndUpdateDB();
    // we can know save app states now since everything is ready
    stateStore.ready = true;
  } else {
    // when welcome page is shown, don't save appstate
    // otherwise it screws up the openProjects
    stateStore.ready = false;
  }
});

onMounted(async () => {
  console.log("onmounted");
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
  locale.value = db.config.language;

  // if there is no path, show welcome carousel
  if (!db.config.storagePath) {
    layoutStore.toggleWelcome(true);
  } else {
    layoutStore.toggleWelcome(false);
  }
});
</script>
