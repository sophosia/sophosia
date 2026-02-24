<template>
  <div class="main-layout-root">
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
          @click="expandSidebar"
        >
          <SidebarExpand width="16" height="16" />
        </div>
      </transition>
    </div>
    <div
      v-if="!layoutStore.sidebarCollapsed"
      class="sidebar-fixed"
      :style="{ width: DEFAULT_SIDEBAR_WIDTH + 'px' }"
    >
      <UnifiedSidebar
        @openPage="(page: Page) => layoutStore.openPage(page)"
      />
    </div>
    <div
      v-if="!layoutStore.sidebarCollapsed"
      class="sidebar-divider"
      @mouseenter="hoverCollapse = true"
      @mouseleave="hoverCollapse = false"
    >
      <transition name="chevron-fade">
        <div
          v-show="hoverCollapse"
          class="sidebar-collapse-trigger"
          @click="collapseSidebar"
        >
          <SidebarCollapse width="16" height="16" />
        </div>
      </transition>
    </div>
    <div class="main-content-area">
      <q-splitter
        class="library-right-menu-panel"
        style="height: 100%"
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
import { SidebarCollapse, SidebarExpand } from "@iconoir/vue";

import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
import { useLayoutStore } from "src/stores/layoutStore";
import { onMounted, onUnmounted, ref } from "vue";

const layoutStore = useLayoutStore();
const ready = ref(false);
const hoverExpand = ref(false);
const hoverCollapse = ref(false);
const DEFAULT_SIDEBAR_WIDTH = 270;

function expandSidebar() {
  layoutStore.toggleSidebar(false);
  hoverExpand.value = false;
}

function collapseSidebar() {
  layoutStore.toggleSidebar(true);
  hoverCollapse.value = false;
}

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

.sidebar-fixed {
  flex-shrink: 0;
  height: 100vh;
  overflow: hidden;
}

.sidebar-divider {
  position: relative;
  width: 2px;
  flex-shrink: 0;
  background: var(--q-edge);
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-content-area {
  flex: 1;
  min-width: 0;
  height: 100vh;
  overflow: hidden;
}

.library-right-menu-panel :deep(.q-splitter__before) {
  min-width: 0;
  overflow: hidden;
}

.library-right-menu-panel :deep(.q-splitter__after) {
  min-width: 0;
  overflow: hidden;
}

.sidebar-collapse-trigger {
  position: absolute;
  z-index: 100;
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

/* Hover zone at the left edge when sidebar is collapsed */
.sidebar-hover-zone {
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 100vh;
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
