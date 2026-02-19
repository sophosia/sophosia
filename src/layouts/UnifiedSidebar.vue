<template>
  <div class="unified-sidebar">
    <div
      class="sidebar-traffic-light-spacer"
      data-tauri-drag-region
    />
    <div class="sidebar-icon-row">
      <q-btn
        class="sidebar-icon-btn"
        flat
        square
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'graph',
            label: 'related-items',
            type: PageType.GraphPage,
          })
        "
      >
        <ShareAndroid width="18" height="18" />
        <q-tooltip>{{ $t("related-items") }}</q-tooltip>
      </q-btn>
      <q-btn
        v-for="btn in pluginManager.getButtons(Component.Ribbon)"
        :key="btn.id"
        class="sidebar-icon-btn"
        flat
        square
        :icon="btn.icon"
        padding="xs"
        @click="btn.click()"
      >
        <q-tooltip>{{ btn.tooltip }}</q-tooltip>
      </q-btn>
      <div class="sidebar-icon-spacer" />
      <q-btn
        class="sidebar-icon-btn"
        flat
        square
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'library',
            label: 'library',
            type: PageType.LibraryPage,
          })
        "
      >
        <BookStack width="18" height="18" />
        <q-tooltip>{{ $t("library") }}</q-tooltip>
      </q-btn>
      <q-btn
        class="sidebar-icon-btn"
        flat
        square
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'workspace',
            label: 'workspace',
            type: PageType.WorkspacePage,
          })
        "
      >
        <Folder width="18" height="18" />
        <q-tooltip>{{ $t("workspace") }}</q-tooltip>
      </q-btn>
      <q-btn
        class="sidebar-icon-btn"
        flat
        square
        padding="xs"
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
        <HelpCircle width="18" height="18" />
        <q-tooltip>{{ $t("help") }}</q-tooltip>
      </q-btn>
      <q-btn
        class="sidebar-icon-btn"
        flat
        square
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'settings',
            label: 'settings',
            type: PageType.SettingsPage,
          })
        "
      >
        <Settings width="18" height="18" />
        <q-tooltip>{{ $t("settings") }}</q-tooltip>
      </q-btn>
    </div>
    <div class="sidebar-content">
      <ProjectNavigator />
      <PluginView
        v-for="view in pluginManager.getViews(Component.LeftMenu)"
        :key="view.id"
        :mount="view.mount"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { resolveResource } from "@tauri-apps/api/path";
import { Component, PageType, db } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import ProjectNavigator from "src/components/leftmenu/ProjectNavigator.vue";
import PluginView from "src/components/leftmenu/PluginView.vue";
import {
  BookStack,
  Folder,
  HelpCircle,
  Settings,
  ShareAndroid,
} from "@iconoir/vue";

defineEmits(["openPage"]);
</script>
<style scoped lang="scss">
.unified-sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  height: 100vh;
  background: var(--color-leftmenu-bkgd);
  border-right: 1px solid var(--q-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.sidebar-traffic-light-spacer {
  height: var(--traffic-light-height);
  flex-shrink: 0;
}

.sidebar-icon-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--q-border);
}

.sidebar-icon-spacer {
  flex: 1;
}

.sidebar-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  color: var(--q-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: var(--q-reg-text);
    background: var(--q-hover);
  }
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
