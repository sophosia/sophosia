<template>
  <ProjectNavigator
    v-if="layoutStore.ribbonToggledBtnUid == 'projectNavigator'"
  />
  <PluginView
    v-else-if="!!toggledUid"
    :uid="toggledUid"
  />
</template>
<script setup lang="ts">
import { useLayoutStore } from "src/stores/layoutStore";
import { nextTick, ref, watch } from "vue";
import PluginView from "./PluginView.vue";
import ProjectNavigator from "./ProjectNavigator.vue";

const layoutStore = useLayoutStore();
// refresh the plugin view whenever the pluginId is changed
const toggledUid = ref("");
watch(
  () => layoutStore.ribbonToggledBtnUid,
  async (uid) => {
    toggledUid.value = "";
    await nextTick();
    toggledUid.value = uid;
  }
);
</script>
