<template>
  <PDFReader
    v-if="visible"
    :projectId="itemId"
  />
</template>

<script setup lang="ts">
import PDFReader from "src/components/pdfreader/PDFReader.vue";
import { PropType } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
