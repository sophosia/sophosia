<template>
  <PDFReader
    v-show="visible"
    :projectId="itemId"
    :focusAnnotId="data?.focusAnnotId"
  />
</template>

<script setup lang="ts">
import PDFReader from "src/components/pdfreader/PDFReader.vue";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, reqruied: true },
  itemId: { type: String, required: true },
  data: {
    type: Object as PropType<{ path?: String; focusAnnotId?: string }>,
    required: false,
  },
});
</script>
