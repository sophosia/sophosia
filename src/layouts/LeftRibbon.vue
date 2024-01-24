<template>
  <div
    style="height: 100vh; background: var(--color-leftmenu-bkgd)"
    class="column justify-between"
  >
    <div>
      <q-btn-toggle
        v-model="stateStore.ribbonToggledBtnUid"
        style="position: absolute; height: 36px"
        class="q-mx-xs"
        spread
        flat
        square
        clearable
        padding="none"
        :ripple="false"
        :options="toggleBtns"
      >
        <template
          v-for="toggleBtn in toggleBtns"
          v-slot:[toggleBtn.slot]
          class="no-hover"
        >
          <q-tooltip>
            {{ toggleBtn.tooltip }}
          </q-tooltip>
        </template>
      </q-btn-toggle>
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
        icon="mdi-bookshelf"
        padding="xs"
        :ripple="false"
        @click="
          $emit('openPage', {
            id: 'library',
            label: t('library'),
            type: 'LibraryPage'
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
        :ripple="false"
        @click="stateStore.toggleWelcome(true)"
      >
        <q-tooltip>{{ $t("workspace") }}</q-tooltip>
      </q-btn>
      <q-btn
        style="width: 30px"
        flat
        square
        padding="xs"
        :ripple="false"
        icon="mdi-help"
        @click="
          async () => {
            $emit('openPage', {
              id: 'help',
              label: t('help'),
              type: 'HelpPage',
              data: {
                path: await resolveResource(
                  `help/help_${db.config.language}.md`
                )
              }
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
        :ripple="false"
        icon="mdi-cog"
        @click="
          $emit('openPage', {
            id: 'settings',
            label: t('settings'),
            type: 'SettingsPage'
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
import { onMounted, ref, watch } from "vue";
import pluginManager from "src/backend/plugin";
import { Button, ComponentName, ToggleButton, db } from "src/backend/database";
import { useI18n } from "vue-i18n";
import { useStateStore } from "src/stores/appState";
import { resolveResource } from "@tauri-apps/api/path";

const stateStore = useStateStore();
const { t, locale } = useI18n({ useScope: "global" });

const props = defineProps({
  isLeftMenuVisible: { type: Boolean, required: true }
});
const emit = defineEmits(["update:isLeftMenuVisible", "openPage"]);

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

watch(
  () => stateStore.ribbonToggledBtnUid,
  (id: string | undefined) => {
    stateStore.showLeftMenu = !!id;
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
    icon: "mdi-file-tree",
    value: "projectNavigator",
    tooltip: t("openedProjects"),
    slot: "projectNavigator"
  });
  for (let toggleBtn of buttons.toggleBtns) {
    toggleBtns.value.push({
      icon: toggleBtn.icon,
      value: toggleBtn.uid,
      tooltip: toggleBtn.tooltip,
      slot: toggleBtn.uid
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
