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
  <MainLayout v-else />
</template>

<script setup lang="ts">
import { db } from "src/backend/database";
import { isScanned, scanAndUpdateDB } from "src/backend/project/scan";
import DialogContainer from "src/components/dialogs/DialogContainer.vue";
import WelcomeCarousel from "src/components/welcome/WelcomeCarousel.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { useStateStore } from "src/stores/stateStore";
import { onMounted, ref, watch } from "vue";
import MainLayout from "./MainLayout.vue";
const stateStore = useStateStore();
const layoutStore = useLayoutStore();
// must determine the existence of storagePath before heading to MainLayout
const loading = ref(false);

onMounted(async () => {
  // if there is no path, show welcome carousel
  layoutStore.toggleWelcome(!db.config.storagePath);
});

watch(
  () => layoutStore.showWelcomeCarousel,
  async () => {
    // once the welcome page is gone
    // we need to load the app state
    // so the app doesn't overwrite the already existing app state
    // then we can start to scan the storage path and build indexeddb (for faster data retrieval)
    if (!layoutStore.showWelcomeCarousel) {
      await stateStore.loadState();
      scanAndUpdateDB();
    }
  }
);
</script>
