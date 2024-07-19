<template>
  <ProjectNavigator v-if="layoutStore.leftMenuViewId === 'projectNavigator'" />
  <div v-else>
    <PluginView
      v-for="view in pluginManager.getViews(Component.LeftMenu)"
      :key="view.id"
      :mount="view.mount"
    />
  </div>
</template>
<script setup lang="ts">
import { Component } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { useLayoutStore } from "src/stores/layoutStore";
import PluginView from "./PluginView.vue";
import ProjectNavigator from "./ProjectNavigator.vue";

const layoutStore = useLayoutStore();
</script>
