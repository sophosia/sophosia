<template>
  <NoteEditor
    v-show="visible"
    :has-toolbar="true"
    :noteId="itemId"
    :data="data"
    :save="false"
  />
</template>
<script setup lang="ts">
import NoteEditor from "src/components/note/NoteEditor.vue";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
