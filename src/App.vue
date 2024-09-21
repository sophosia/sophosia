<template>
  <router-view />
</template>
<script setup lang="ts">
import { useLayoutStore } from "src/stores/layoutStore";
import { useSettingStore } from "src/stores/settingStore";
import { useStateStore } from "src/stores/stateStore";
import { onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { db } from "./backend/database";
import { useProjectStore } from "./stores/projectStore";
import { appWindow } from "@tauri-apps/api/window";
import { getSupabaseClient } from "./backend/authSupabase";
import { useChatStore } from "./stores/chatStore";
const { locale } = useI18n({ useScope: "global" });
const stateStore = useStateStore();
const layoutStore = useLayoutStore();
const settingStore = useSettingStore();
const projectStore = useProjectStore();
const chatStore = useChatStore();
const supabase = getSupabaseClient();

const handleFocus = () => {
  supabase.auth.startAutoRefresh();
};

const handleBlur = () => {
  supabase.auth.stopAutoRefresh();
};

onMounted(async () => {
  console.log("onmounted");
  if (process.env.PROD) {
    // disable default context menu
    // use ctrl+shift+i on window / linux, command+option+i on macos to open dev tool
    document.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // try to load the storage path see if it exists
  await db.getConfig();
  locale.value = db.config.language;

  // regardless of the existence of storagePath
  // we need to apply settings: fontSize, theme, etc...
  // if no storage path default state will be used
  await stateStore.loadState();

  // ensure when user is authenticated whenever they are logged in
  appWindow.listen("tauri://focus", () => handleFocus());
  appWindow.listen("tauri://blur", () => handleBlur());
});

settingStore.$subscribe(() => stateStore.updateState());
layoutStore.$subscribe(() => stateStore.updateState());
chatStore.$subscribe(() => stateStore.updateState());

watch(
  () => projectStore.openedProjects.map((p) => p._id),
  () => stateStore.updateState()
);
</script>
