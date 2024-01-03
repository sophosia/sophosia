<template>
  <ExcalidrawReact
    :visible="show"
    :noteId="itemId"
  />
</template>

<script setup lang="ts">
import { applyPureReactInVue } from "veaury";
import CustomExcalidraw from "src/components/note/CustomExcalidraw";
import { PropType, onMounted, ref, watch } from "vue";
const props = defineProps({
  itemId: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const ExcalidrawReact = applyPureReactInVue(CustomExcalidraw);
const show = ref(props.visible);

// when closing by removeGLComponent
// set visibility to false before closing to prevent max call stack error
watch(
  () => props.visible,
  (visible: boolean) => {
    show.value = visible;
  }
);

watch(
  () => props.itemId,
  (id: string) => {
    invisibleWhenClose();
  }
);

function invisibleWhenClose() {
  const activeTitle = document.querySelector(
    'span[class="lm_title lm_focused"]'
  );
  if (!activeTitle) return;
  const closeControl = activeTitle.nextElementSibling as HTMLDivElement;
  if (!closeControl) return;
  closeControl.setAttribute("itemId", props.itemId);
  closeControl.onmousedown = (e) => {
    if ((e.target as HTMLDivElement).getAttribute("itemId") === props.itemId) {
      show.value = false;
    }
  };
}

onMounted(() => {
  // MUST STOP render the react component before this vue component is unmounted
  // this can avoid maximum call stack size exceeds error from veaury
  invisibleWhenClose();
});
</script>
