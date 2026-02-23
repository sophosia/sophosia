<template>
  <PDFReader
    v-if="visible"
    :projectId="projectId"
    :pdfPath="data?.pdfPath"
    :pdfName="pdfName"
    :focusAnnotId="data?.focusAnnotId"
  />
</template>

<script setup lang="ts">
import PDFReader from "src/components/pdfreader/PDFReader.vue";
import { computed, PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, reqruied: true },
  itemId: { type: String, required: true },
  data: {
    type: Object as PropType<{
      path?: string;
      focusAnnotId?: string;
      pdfPath?: string;
    }>,
    required: false,
  },
});

// itemId is now "projectId/pdfName.pdf" for PDF tabs
const projectId = computed(() => props.itemId.split("/")[0]);
const pdfName = computed(() => {
  const parts = props.itemId.split("/");
  return parts.length > 1 ? parts.slice(1).join("/") : undefined;
});
</script>
