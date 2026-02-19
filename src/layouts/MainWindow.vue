<template>
  <DialogContainer />
  <WelcomeCarousel
    v-if="layoutStore.showWelcomeCarousel"
    v-model="layoutStore.showWelcomeCarousel"
  />
  <div
    v-else-if="!isIndexed"
    style="margin-top: 50vh"
    class="q-px-xl row justify-center"
  >
    <div class="text-h6">{{ $t("indexing-files") }}</div>
    <q-linear-progress
      rounded
      size="1.2rem"
      color="primary"
      :value="indexingProgress"
    >
      <div class="absolute-full flex flex-center">
        <q-badge
          color="white"
          text-color="accent"
          :label="`${indexingProgress * 100}%`"
        />
      </div>
    </q-linear-progress>
  </div>
  <MainLayout v-else />
</template>

<script setup lang="ts">
import { Config, db } from "src/backend/database";
import { migrate } from "src/backend/database/migration";
import { indexFiles } from "src/backend/indexer";
import DialogContainer from "src/components/dialogs/DialogContainer.vue";
import WelcomeCarousel from "src/components/welcome/WelcomeCarousel.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { useStateStore } from "src/stores/stateStore";
import { onMounted, ref, watch } from "vue";
import { type } from "@tauri-apps/api/os";
import { getCurrent } from "@tauri-apps/api/window";
import MainLayout from "./MainLayout.vue";
const stateStore = useStateStore();
const layoutStore = useLayoutStore();
// must determine the existence of storagePath before heading to MainLayout
const isIndexed = ref(false);
const indexingProgress = ref(0);

onMounted(async () => {
  // Detect platform for traffic light spacing
  const platform = await type();
  document.body.dataset.platform = platform;

  // Listen for fullscreen changes on macOS
  if (platform === "Darwin") {
    const win = getCurrent();
    await win.listen("tauri://resize", async () => {
      const fs = await win.isFullscreen();
      document.body.dataset.fullscreen = String(fs);
    });
  }

  // if there is no path, show welcome carousel
  layoutStore.toggleWelcome(!db.config.storagePath);
});

watch(
  () => layoutStore.showWelcomeCarousel,
  async () => {
    // once the welcome page is gone
    // we need to load the app state
    // so the app doesn't overwrite the already existing app state
    // then we can start to scan the storage path and build sqlitedb (for faster data retrieval)
    if (!layoutStore.showWelcomeCarousel) {
      await migrate();
      await indexFiles((progress) => {
        indexingProgress.value = progress;
      });
      await db.setConfig({ lastScanTime: Date.now() } as Config);
      await db.createHiddenFolders();
      await stateStore.loadState();
      isIndexed.value = true;
    }
  }
);
</script>
