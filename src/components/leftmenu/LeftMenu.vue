<template>
  <ProjectNavigator
    v-if="layoutStore.ribbonClickedBtnId === 'projectNavigator'"
  />
  <PluginView
    v-else
    :uid="layoutStore.ribbonClickedBtnId"
  />
</template>
<script setup lang="ts">
import { useLayoutStore } from "src/stores/layoutStore";
import PluginView from "./PluginView.vue";
import ProjectNavigator from "./ProjectNavigator.vue";

const layoutStore = useLayoutStore();
</script>
