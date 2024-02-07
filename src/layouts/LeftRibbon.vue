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
        @click="layoutStore.toggleLeftMenu()"
      >
        <q-tooltip>{{ $t("openedProjects") }}</q-tooltip>
      </q-btn>
    </div>

    <div>
      <q-btn
        v-for="(btn, index) in pluginBtns"
        :key="index"
        style="width: 30px"
        flat
        square
        padding="xs"
        :icon="btn.icon"
        @click="onPluginBtnClick(btn)"
      >
        <q-tooltip>{{ btn.tooltip }}</q-tooltip>
      </q-btn>
      <q-btn
        style="width: 30px"
        flat
        square
        icon="mdi-library-outline"
        padding="xs"
        @click="
          $emit('openPage', {
            id: 'library',
            label: t('library'),
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
              label: t('help'),
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
            label: t('settings'),
            type: 'SettingsPage',
          })
        "
      >
        <q-badge
          v-if="isUpdateAvailable"
          floating
          rounded
          color="blue"
          style="top: 10%; right: 10%"
        ></q-badge>
        <q-tooltip>{{ $t("settings") }}</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { resolveResource } from "@tauri-apps/api/path";
import { Button, ComponentName, db } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { useLayoutStore } from "src/stores/layoutStore";
import { useStateStore } from "src/stores/stateStore";
import { onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const stateStore = useStateStore();
const layoutStore = useLayoutStore();
const { t, locale } = useI18n({ useScope: "global" });

const emit = defineEmits(["openPage"]);

const isUpdateAvailable = ref(false);
const pluginBtns = ref<Button[]>([]);
const clickedBtnUid = ref("");
const toggleBtns = ref<
  { icon: string; value: string; tooltip: string; slot: string }[]
>([]);

// change tooltip locale
watch(
  () => locale.value,
  (_) => {
    let toggleBtn = toggleBtns.value.find(
      (tb) => tb.value == "projectNavigator"
    );
    if (toggleBtn) toggleBtn.tooltip = t("openedProjects");
  }
);

// whenever the status of plugins are changed, reload the plugins
watch(
  pluginManager.statusMap,
  (_) => {
    mountBtns();
  },
  { deep: true }
);

/**
 * Handles the click event on plugin buttons.
 * When a plugin button is clicked, the method sets the clicked button's UID and triggers the button's click action.
 * @param btn - The button object which contains details about the plugin button clicked.
 */
function onPluginBtnClick(btn: Button) {
  clickedBtnUid.value = btn.uid;
  btn.click();
}

/**
 * Mounts buttons on the ribbon.
 * This method is responsible for loading and displaying buttons on the ribbon, both regular and toggle buttons, from the plugin manager.
 * It updates the `pluginBtns` and `toggleBtns` reactive properties with the relevant button data.
 */
function mountBtns() {
  let buttons = pluginManager.getBtns(ComponentName.RIBBON);
  pluginBtns.value = buttons.btns;
  toggleBtns.value = [];
  toggleBtns.value.push({
    icon: "mdi-file-tree-outline",
    value: "projectNavigator",
    tooltip: t("openedProjects"),
    slot: "projectNavigator",
  });
  for (let toggleBtn of buttons.toggleBtns) {
    toggleBtns.value.push({
      icon: toggleBtn.icon,
      value: toggleBtn.uid,
      tooltip: toggleBtn.tooltip,
      slot: toggleBtn.uid,
    });
  }
}

onMounted(() => {
  mountBtns();
});
</script>
<style scoped lang="scss">
.q-icon {
  justify-content: unset;
}
</style>
