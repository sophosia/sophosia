<template>
  <PDFReader
    v-if="visible"
    :projectId="data._id"
  />
</template>

<script setup lang="ts">
import PDFReader from "src/components/pdfreader/PDFReader.vue";
import { PageData } from "src/backend/database";
import { PropType } from "vue";
const props = defineProps({
  id: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: {
    type: Object as PropType<PageData>,
    required: true,
  },
});
</script>
