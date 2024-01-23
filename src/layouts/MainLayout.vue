<template>
  <q-splitter
    :model-value="30"
    unit="px"
    separator-style="cursor: default; background: var(--q-dark)"
  >
    <template v-slot:before>
      <LeftRibbon
        v-model:isLeftMenuVisible="stateStore.showLeftMenu"
        @openPage="(page: Page) => layoutStore.openPage(page)"
      />
    </template>
    <template v-slot:after>
      <q-splitter
        :limits="splitterLimits"
        emit-immediately
        separator-style="background: var(--q-edge)"
        :separator-class="{
          'q-splitter-separator': stateStore.showLeftMenu,
        }"
        :disable="!stateStore.showLeftMenu"
        v-model="leftMenuSize"
        @update:model-value="(size) => resizeLeftMenu(size)"
      >
        <template v-slot:before>
          <LeftMenu
            v-if="ready"
            style="height: 100vh"
            ref="leftMenu"
          />
        </template>
        <template v-slot:after>
          <GLayout
            style="width: 100%; height: 100vh"
            ref="layout"
          ></GLayout>
        </template>
      </q-splitter>
    </template>
  </q-splitter>
  <DialogContainer />
</template>

<script setup lang="ts">
// types
import { Page } from "src/backend/database";
// components
import LeftMenu from "src/components/leftmenu/LeftMenu.vue";
import LeftRibbon from "./LeftRibbon.vue";
// GoldenLayout
import "src/css/goldenlayout/base.scss";
import "src/css/goldenlayout/theme.scss";
import GLayout from "./GLayout.vue";
// db
import { useStateStore } from "src/stores/stateStore";
// utils
import { listen } from "@tauri-apps/api/event";
import pluginManager from "src/backend/plugin";
import DialogContainer from "src/components/dialogs/DialogContainer.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const stateStore = useStateStore();
const layoutStore = useLayoutStore();

/*************************************************
 * Component refs, data, computed values
 *************************************************/
const layout = ref<InstanceType<typeof GLayout> | null>(null);
const leftMenu = ref<InstanceType<typeof LeftMenu> | null>(null);

const leftMenuSize = ref(0);
const ready = ref(false);
const splitterLimits = ref([15, 60]);

/*******************
 * Watchers
 *******************/
watch(
  () => stateStore.showLeftMenu,
  (visible: boolean) => {
    if (visible) {
      // if visible, the left menu has at least 10 unit width
      leftMenuSize.value = Math.max(stateStore.leftMenuSize, 15);
      splitterLimits.value = [15, 60];
    } else {
      // if not visible, record the size and close the menu
      stateStore.leftMenuSize = leftMenuSize.value;
      splitterLimits.value = [0, 60];

      leftMenuSize.value = 0;
    }
    nextTick(() => {
      stateStore.saveAppState();
    });
  }
);

// onLayouChanged, appstate and layout will be saved
layoutStore.$subscribe((_, state) => {
  if (state.initialized) stateStore.currentItemId = state.currentItemId;
});
stateStore.$subscribe((mutation, state) => {
  stateStore.saveAppState();
});

/*******************************************************
 * Methods
 *******************************************************/

/***************************************************
 * Layout and AppState
 ***************************************************/

async function resizeLeftMenu(size: number) {
  if (size < 8) {
    leftMenuSize.value = 0;
    stateStore.ribbonToggledBtnUid = "";
    // this will trigger stateStore.showLeftMenu = false;
  }
  stateStore.leftMenuSize = size > 10 ? size : 20;
  stateStore.saveAppState();
}

/**
 * Given a request url, return the requested itemId
 * @params url
 * @returns itemId
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

  // apply layout related settings
  if (stateStore.showLeftMenu) leftMenuSize.value = stateStore.leftMenuSize;

  // the openItemIds are ready
  // we can load the projectTree
  ready.value = true;

  // get deep link from window object if the app is invoked by deep link
  const itemId = parseDeepLink(
    (window as Window & typeof globalThis & { urlSchemeRequest: string })
      .urlSchemeRequest
  );
  await stateStore.openItem(itemId);

  // listen to the deep link event
  unlisten = await listen("deep-link", async (e) => {
    const itemId = parseDeepLink(e.payload as string);
    await stateStore.openItem(itemId);
  });
});

onUnmounted(() => {
  unlisten();
});
</script>
