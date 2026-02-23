<template>
  <div class="main-layout-root">
    <transition name="sidebar-slide">
      <UnifiedSidebar
        v-show="!layoutStore.sidebarCollapsed"
        @openPage="(page: Page) => layoutStore.openPage(page)"
      />
    </transition>
    <!-- Hover zone to reveal expand chevron when sidebar is collapsed -->
    <div
      v-if="layoutStore.sidebarCollapsed"
      class="sidebar-hover-zone"
      @mouseenter="hoverExpand = true"
      @mouseleave="hoverExpand = false"
    >
      <transition name="chevron-fade">
        <div
          v-show="hoverExpand"
          class="sidebar-expand-trigger"
          @click="layoutStore.toggleSidebar(false)"
        >
          <SidebarExpand width="16" height="16" />
        </div>
      </transition>
    </div>
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
import { SidebarExpand } from "@iconoir/vue";

import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
import { useLayoutStore } from "src/stores/layoutStore";
import { onMounted, onUnmounted, ref } from "vue";

const layoutStore = useLayoutStore();
const ready = ref(false);
const hoverExpand = ref(false);

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

/* Sidebar slide transition */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: width 0.25s ease, min-width 0.25s ease, opacity 0.25s ease;
  overflow: hidden;
}

.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
}

/* Hover zone at the left edge when sidebar is collapsed */
.sidebar-hover-zone {
  position: relative;
  width: 20px;
  min-width: 20px;
  height: 100vh;
  flex-shrink: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* The expand trigger chevron */
.sidebar-expand-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 48px;
  border-radius: 0 6px 6px 0;
  background: var(--color-leftmenu-bkgd);
  border: 1px solid var(--q-border);
  border-left: none;
  color: var(--q-text-muted);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease;

  &:hover {
    opacity: 1;
    color: var(--q-reg-text);
    background: var(--q-hover);
  }
}

/* Chevron fade transition */
.chevron-fade-enter-active,
.chevron-fade-leave-active {
  transition: opacity 0.2s ease;
}

.chevron-fade-enter-from,
.chevron-fade-leave-to {
  opacity: 0;
}
</style>
