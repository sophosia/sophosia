<template>
  <div ref="root"></div>
</template>
<script setup lang="ts">
import { PropType, onMounted, ref } from "vue";
const props = defineProps({
  mount: {
    type: Function as PropType<(container: HTMLElement) => void>,
    required: true,
  },
});

const root = ref<HTMLElement>();
onMounted(() => {
  console.log("loading a view");
  props.mount(root.value!);
});
</script>
