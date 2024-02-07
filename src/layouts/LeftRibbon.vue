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
        :color="layoutStore.leftMenuSize > 0 ? 'primary' : ''"
        @click="
          () => {
            layoutStore.prvRibbonClickedBtnId = layoutStore.ribbonClickedBtnId;
            layoutStore.ribbonClickedBtnId = 'projectNavigator';
            layoutStore.toggleLeftMenu();
          }
        "
      >
        <q-tooltip>{{ $t("openedProjects") }}</q-tooltip>
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
            label: $t('library'),
            type: 'LibraryPage',
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
              label: $t('help'),
              type: 'HelpPage',
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
            label: $t('settings'),
            type: 'SettingsPage',
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
import { db } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";

const layoutStore = useLayoutStore();
const emit = defineEmits(["openPage"]);
</script>
