<template>
  <q-splitter
    :model-value="30"
    unit="px"
    separator-style="cursor: default; background: var(--q-dark)"
  >
    <template v-slot:before>
      <LeftRibbon
        v-model:isLeftMenuVisible="stateStore.showLeftMenu"
        @openPage="(page: Page) => setComponent(page)"
      />
    </template>
    <template v-slot:after>
      <q-splitter
        :limits="[0, 60]"
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
            v-model:currentItemId="stateStore.currentItemId"
            @layoutchanged="onLayoutChanged"
            ref="layout"
          ></GLayout>
        </template>
      </q-splitter>
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
// types
import { Project, Note, Page, NoteType, db } from "src/backend/database";
// components
import LeftRibbon from "./LeftRibbon.vue";
import LeftMenu from "src/components/leftmenu/LeftMenu.vue";
// GoldenLayout
import GLayout from "./GLayout.vue";
import "src/css/goldenlayout/base.scss";
import "src/css/goldenlayout/theme.scss";
// db
import { useStateStore } from "src/stores/appState";
import { getLayout, updateLayout } from "src/backend/appState";
// utils
import { nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { colors } from "quasar";
const { getPaletteColor } = colors;
import pluginManager from "src/backend/plugin";
import { listen } from "@tauri-apps/api/event";

interface PageItem {
  _id: string;
  label: string;
}

const stateStore = useStateStore();
const { t } = useI18n({ useScope: "global" });

/*************************************************
 * Component refs, data, computed values
 *************************************************/
const layout = ref<InstanceType<typeof GLayout> | null>(null);
const leftMenu = ref<InstanceType<typeof LeftMenu> | null>(null);

const leftMenuSize = ref(0);
const ready = ref(false);

provide("onLayoutChanged", onLayoutChanged);
provide("updateComponent", updateComponent);

/*******************
 * Watchers
 *******************/
watch(
  () => stateStore.showLeftMenu,
  (visible: boolean) => {
    if (visible) {
      // if visible, the left menu has at least 10 unit width
      leftMenuSize.value = Math.max(stateStore.leftMenuSize, 15);
    } else {
      // if not visible, record the size and close the menu
      stateStore.leftMenuSize = leftMenuSize.value;
      leftMenuSize.value = 0;
    }
    nextTick(() => {
      if (layout.value) layout.value.resize();
      saveLayout();
      stateStore.saveAppState();
    });
  }
);

watch(
  () => stateStore.openedPage,
  (page: Page) => {
    setComponent(page);
  }
);

watch(
  () => stateStore.closedItemId,
  async (id: string) => {
    if (!id) return;
    removeComponent(id);
    // clear this so we can reclose a reopened item
    stateStore.closedItemId = "";
    stateStore.saveAppState();
  }
);

// change special page title when locale updated
watch(
  () => db.config.language,
  () => {
    translateTitles();
  }
);

/*******************************************************
 * Methods
 *******************************************************/
function translateTitles() {
  for (let id of ["library", "settings", "help"])
    updateComponent(id, { id: id, label: t(id) });
}
/*************************************************
 * GoldenLayout (set, rename, remove component)
 *************************************************/

/**
 * Set focus to component with specified id
 * create it if it doesn't exist
 * @param id - itemId
 */
async function setComponent(page: Page) {
  if (layout.value)
    await layout.value.addGLComponent(
      page.type,
      page.label,
      page.id,
      page.data
    );
  await saveLayout();
  stateStore.saveAppState();
}

/**
 * Closing the project need to close the related windows
 * @param id - itemId
 */
function removeComponent(id: string) {
  if (layout.value) layout.value.removeGLComponent(id);
}

/**
 * After renaming a row in projectTree, we need to rename the window title.
 * @param item
 */
async function updateComponent(
  oldItemId: string,
  state: { id: string; label: string }
) {
  if (!layout.value) return;
  layout.value.updateGLComponent(oldItemId, state);
  let config = layout.value.getLayoutConfig();
  await updateLayout(config);
}

/***************************************************
 * Layout and AppState
 ***************************************************/

async function resizeLeftMenu(size: number) {
  if (layout.value) layout.value.resize();
  if (size < 8) {
    leftMenuSize.value = 0;
    stateStore.ribbonToggledBtnUid = "";
    // this will trigger stateStore.showLeftMenu = false;
  }
  stateStore.leftMenuSize = size > 10 ? size : 20;
  saveLayout();
  stateStore.saveAppState();
}

/**
 * When layout is changed, save layout and appstate
 */
async function onLayoutChanged() {
  await nextTick();

  // if the last window is closed, open library page
  // this is to prevent the undefined root problem
  if (!layout.value || !ready.value) return;
  let config = layout.value.getLayoutConfig();
  if (config.root === undefined) {
    setComponent({
      id: "library",
      label: t("library"),
      type: "LibraryPage",
    });
    await nextTick();
  }

  // save layouts and appstate
  await saveLayout();
  stateStore.saveAppState();
}

async function saveLayout() {
  if (!layout.value || !layout.value.initialized) return;
  let config = layout.value.getLayoutConfig();
  await updateLayout(config);
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
  let _layout = await getLayout();
  if (layout.value) await layout.value.loadGLLayout(_layout.config);
  translateTitles();

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
