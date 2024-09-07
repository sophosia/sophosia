<template>
  <div
    style="height: 100vh; background: var(--color-leftmenu-bkgd)"
    class="column justify-between"
  >
    <div>
      <q-btn
        style="width: 30px"
        flat
        square
        icon="mdi-file-tree-outline"
        padding="xs"
        :color="
          layoutStore.leftMenuSize > 0 &&
          layoutStore.ribbonClickedBtnId === 'projectNavigator'
            ? 'primary'
            : ''
        "
        @click="
          () => {
            layoutStore.prvRibbonClickedBtnId = layoutStore.ribbonClickedBtnId;
            layoutStore.ribbonClickedBtnId = 'projectNavigator';
            layoutStore.toggleLeftMenu();
            layoutStore.setLeftMenuView('projectNavigator');
          }
        "
      >
        <q-tooltip>{{ $t("openedProjects") }}</q-tooltip>
      </q-btn>
      <q-btn
        v-for="btn in pluginManager.getButtons(Component.Ribbon)"
        :key="btn.id"
        style="width: 30px"
        flat
        square
        :icon="btn.icon"
        padding="xs"
        :color="
          layoutStore.leftMenuSize > 0 &&
          layoutStore.ribbonClickedBtnId === btn.id
            ? 'primary'
            : ''
        "
        @click="
          () => {
            layoutStore.prvRibbonClickedBtnId = layoutStore.ribbonClickedBtnId;
            layoutStore.ribbonClickedBtnId = btn.id;
            btn.click();
          }
        "
      >
        <q-tooltip>{{ btn.tooltip }}</q-tooltip>
      </q-btn>
    </div>
<div v-if= "isUserLoggedIn()">
  <q-btn
  style="width: 30px"
  flat
  square
  icon="mdi-chat-outline"
  
  padding="xs"
  @click="chatStore.openModal()"
  >
  <q-tooltip>{{ $t("chat") }}</q-tooltip>

</q-btn>
</div>
    <div>
      <q-btn
        style="width: 30px"
        flat
        square
        icon="mdi-library-outline"
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'library',
            label: 'library',
            type: PageType.LibraryPage,
          })
        "
      >
        <q-tooltip>{{ $t("library") }}</q-tooltip>
      </q-btn>
      <q-btn
        style="width: 30px"
        flat
        square
        icon="mdi-safe"
        padding="xs"
        @click="layoutStore.toggleWelcome(true)"
      >
        <q-tooltip>{{ $t("workspace") }}</q-tooltip>
      </q-btn>
      <q-btn
        style="width: 30px"
        flat
        square
        padding="xs"
        icon="mdi-help-circle-outline"
        @click="
          async () => {
            $emit('openPage', {
              id: 'help',
              label: 'help',
              type: PageType.HelpPage,
              data: {
                path: await resolveResource(
                  `help/help_${db.config.language}.md`
                ),
              },
            });
          }
        "
      >
        <q-tooltip>{{ $t("help") }}</q-tooltip>
      </q-btn>
      <q-btn
        style="width: 30px"
        flat
        square
        padding="xs"
        icon="mdi-cog-outline"
        @click="
          $emit('openPage', {
            id: 'settings',
            label: 'settings',
            type: PageType.SettingsPage,
          })
        "
      >
        <q-tooltip>{{ $t("settings") }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { resolveResource } from "@tauri-apps/api/path";
import { Component, PageType, db } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { useLayoutStore  } from "src/stores/layoutStore";
import { useAccountStore } from "src/stores/accountStore";
import { useChatStore } from "src/stores/chatStore";
const chatStore = useChatStore();
const layoutStore = useLayoutStore();
const emit = defineEmits(["openPage"]);
const accountStore = useAccountStore();
const isUserLoggedIn =  () => {
  return true? accountStore.user.email : false;
}

</script>
