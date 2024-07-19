<template>
  <h2>{{ $t("coming-soon") }}</h2>
  <!-- <PluginSettings
    v-if="visible"
    :pluginId="itemId"
  /> -->
</template>
<script setup lang="ts">
// import PluginSettings from "src/components/plugin/PluginSettings.vue";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
