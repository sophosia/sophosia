<template>
  <q-splitter
    :model-value="30"
    unit="px"
    separator-style="cursor: default;"
    :limits="[30, 30]"
  >
    <template v-slot:before>
      <LeftRibbon @openPage="(page: Page) => layoutStore.openPage(page)" />
    </template>
    <template v-slot:after>
      <q-splitter
        :limits="[0, 60]"
        separator-style="background: var(--q-edge)"
        :separator-class="{
          'q-splitter-separator': layoutStore.leftMenuSize > 0,
        }"
        :disable="!(layoutStore.leftMenuSize > 0)"
        v-model="layoutStore.leftMenuSize"
        @update:model-value="(size) => layoutStore.resizeLeftMenu(size)"
      >
        <template v-slot:before>
          <LeftMenu
            v-if="ready"
            style="height: 100vh"
          />
        </template>
        <template v-slot:after>
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
        </template>
      </q-splitter>
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
import type { Page } from "src/backend/database";
import LayoutContainer from "src/components/layout/LayoutContainer.vue";
import LeftMenu from "src/components/leftmenu/LeftMenu.vue";
import LeftRibbon from "./LeftRibbon.vue";
import RightMenu from "src/components/rightmenu/RightMenu.vue";

import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
import { useAccountStore } from "src/stores/accountStore";
import { useLayoutStore } from "src/stores/layoutStore";
import { onMounted, onUnmounted, ref } from "vue";

const layoutStore = useLayoutStore();
const ready = ref(false);
/**
 * Parses a deep link URL to extract the item ID. This is used to handle navigation to a specific item
 * within the application based on a URL scheme.
 * @param url - The deep link URL received by the application.
 * @returns itemId - The extracted item ID from the URL.
 */
async function parseDeepLink(url: string | undefined) {
  if (!url || !url.startsWith("sophosia://")) return;
  // URL object has different properties on windows, and linux-like system
  // don't parse url by URL(), parse the string directly
  const [action, params] = url.replace("sophosia://", "").split("/");
  switch (action) {
    case "open-item":
      const itemId = decodeURI(params);
      await layoutStore.openItem(itemId);
      break;
    case "auth":
      const accountStore = useAccountStore();
      await accountStore.parseURL(params);
      break;
  }
}
/*************************************************
 * onMounted
 *************************************************/
let unlisten: () => void;
onMounted(async () => {
  pluginManager.init(); // initialize pluginManager after storagePath is set

  // the openItemIds are ready
  // we can load the projectTree
  ready.value = true;

  // get deep link from window object if the app is invoked by deep link
  await parseDeepLink(
    (window as Window & typeof globalThis & { urlSchemeRequest: string })
      .urlSchemeRequest
  );

  // listen to the deep link event
  unlisten = await listen("deep-link", (e) => {
    console.log("deeplink event", e);
    parseDeepLink(e.payload as string);
  });
});

onUnmounted(() => {
  unlisten();
});
</script>
