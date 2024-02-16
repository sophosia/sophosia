<template>
  <q-splitter
    :model-value="30"
    unit="px"
    separator-style="cursor: default; background: var(--q-dark)!important;"
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
          <LayoutContainer />
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

import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
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
function parseDeepLink(url: string | undefined): string {
  const request = "sophosia://open-item/";
  let itemId = "";
  if (url && url.startsWith(request))
    // use decodeURI in case the url contains non-english character
    itemId = decodeURI(url.replace(request, ""));
  return itemId;
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
  const itemId = parseDeepLink(
    (window as Window & typeof globalThis & { urlSchemeRequest: string })
      .urlSchemeRequest
  );
  await layoutStore.openItem(itemId);

  // listen to the deep link event
  unlisten = await listen("deep-link", async (e) => {
    const itemId = parseDeepLink(e.payload as string);
    await layoutStore.openItem(itemId);
  });
});

onUnmounted(() => {
  unlisten();
});
</script>
