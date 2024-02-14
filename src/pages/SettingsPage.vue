<template>
  <SettingsMenu v-show="visible" />
</template>

<script setup lang="ts">
import SettingsMenu from "src/components/settings/SettingsMenu.vue";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
