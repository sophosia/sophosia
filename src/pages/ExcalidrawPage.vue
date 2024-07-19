<template>
  <!-- the outer most layer is to make the page drag and drop working  -->
  <div
    v-if="visible"
    style="width: 100%; height: 100%"
  >
    <ExcalidrawReact :noteId="itemId" />
  </div>
</template>

<script setup lang="ts">
import CustomExcalidraw from "src/components/note/CustomExcalidraw";
import { applyPureReactInVue } from "veaury";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const ExcalidrawReact = applyPureReactInVue(CustomExcalidraw);
</script>
