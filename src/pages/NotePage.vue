<template>
  <NoteEditor
    v-if="visible"
    :has-toolbar="true"
    :noteId="itemId"
    :data="data"
  />
</template>
<script setup lang="ts">
import NoteEditor from "src/components/note/NoteEditor.vue";
import { PropType } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
<style lang="scss">
.vditor-reset > pre {
  // Fix padding no matter what window size it is
  padding: 10px 35px !important;
}
</style>
