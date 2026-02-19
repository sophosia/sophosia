<template>
  <div class="main-layout-root">
    <UnifiedSidebar @openPage="(page: Page) => layoutStore.openPage(page)" />
    <div class="main-area">
      <q-splitter
        class="library-right-menu-panel"
        reverse
        :limits="[0, 60]"
        separator-style="background: var(--q-edge)"
        :separator-class="{
          'q-splitter-separator': layoutStore.rightMenuSize > 0,
          hidden: !(layoutStore.rightMenuSize > 0),
        }"
        :disable="!(layoutStore.rightMenuSize > 0)"
        v-model="layoutStore.rightMenuSize"
        @update:model-value="(size: number) => layoutStore.resizeRightMenu(size)"
      >
        <template v-slot:before>
          <LayoutContainer />
        </template>
        <template v-slot:after>
          <RightMenu />
        </template>
      </q-splitter>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Page } from "src/backend/database";
import LayoutContainer from "src/components/layout/LayoutContainer.vue";
import UnifiedSidebar from "./UnifiedSidebar.vue";
import RightMenu from "src/components/library/RightMenu.vue";

import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
import { useLayoutStore } from "src/stores/layoutStore";
import { onMounted, onUnmounted, ref } from "vue";

const layoutStore = useLayoutStore();
const ready = ref(false);

async function parseDeepLink(url: string | undefined) {
  if (!url || !url.startsWith("sophosia://")) return;
  const [action, params] = url.replace("sophosia://", "").split("/");
  switch (action) {
    case "open-item":
      const itemId = decodeURI(params);
      await layoutStore.openItem(itemId);
      break;
  }
}

let unlisten: () => void;
onMounted(async () => {
  pluginManager.init();
  ready.value = true;

  await parseDeepLink(
    (window as Window & typeof globalThis & { urlSchemeRequest: string })
      .urlSchemeRequest
  );

  unlisten = await listen("deep-link", (e) => {
    console.log("deeplink event", e);
    parseDeepLink(e.payload as string);
  });
});

onUnmounted(() => {
  unlisten();
});
</script>
<style scoped lang="scss">
.main-layout-root {
  display: flex;
  flex-direction: row;
  height: 100vh;
  overflow: hidden;
}

.main-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
