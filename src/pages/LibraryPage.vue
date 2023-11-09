<template>
  <ProjectBrowser v-if="visible" />
</template>
<script setup lang="ts">
import ProjectBrowser from "src/components/library/ProjectBrowser.vue";
import { PageData } from "src/backend/database";
import { PropType } from "vue";
const props = defineProps({
  id: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<PageData>, required: true },
});
</script>
