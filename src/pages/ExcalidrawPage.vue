<template>
  <!-- the outer most layer is to make the page drag and drop working  -->
  <div style="width: 100%; height: 100%">
    <ExcalidrawReact
      v-if="visible"
      :noteId="itemId"
    />
  </div>
</template>

<script setup lang="ts">
// wait until https://github.com/devilwjp/veaury/pull/92 merges
// import { applyPureReactInVue } from "veaury";
import { applyPureReactInVue } from "src/backend/veaury.esm";
import CustomExcalidraw from "src/components/note/CustomExcalidraw";
import { PropType } from "vue";
const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const ExcalidrawReact = applyPureReactInVue(CustomExcalidraw);
</script>
