<template>
  <NoteEditor
    :has-toolbar="true"
    :noteId="itemId"
    :data="data"
    :save="true"
  />
</template>
<script setup lang="ts">
import NoteEditor from "src/components/note/NoteEditor.vue";
import { PropType } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});
</script>
