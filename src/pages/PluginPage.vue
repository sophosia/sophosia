<template>
  <div
    v-if="visible"
    ref="root"
  ></div>
</template>
<script setup lang="ts">
import { Component } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { PropType, ref, watchEffect } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  visible: { type: Boolean, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const root = ref<HTMLElement>();

watchEffect(() => {
  if (!root.value || !props.visible) return;
  const views = pluginManager.getViews(Component.PluginPage);
  for (let view of views) {
    if (view.id === props.itemId) view.mount(root.value);
  }
});
</script>
