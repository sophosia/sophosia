<template>
  <ExcalidrawReact
    v-if="visible"
    :noteId="itemId"
  />
</template>

<script setup lang="ts">
import { applyPureReactInVue } from "src/backend/veaury.esm";
import CustomExcalidraw from "src/components/note/CustomExcalidraw";
import { PropType } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const ExcalidrawReact = applyPureReactInVue(CustomExcalidraw);
</script>
