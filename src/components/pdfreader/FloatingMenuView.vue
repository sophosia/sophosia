<template>
  <div
    ref="root"
    style="padding: 2%"
  >
    {{ text }}
  </div>
</template>

<script setup lang="ts">
import { textChangeRangeIsUnchanged } from "typescript";
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  text: { type: String, required: true },
});

const root = ref<HTMLElement>();

const emits = defineEmits(["close"]);

const handleClickOutside = (event: MouseEvent) => {
  if (root.value && !root.value.contains(event.target as Node)) {
    emits("close");
  }
};

onMounted(() => {
  window.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener("click", handleClickOutside);
});

// Watch for changes in the text prop
watch(
  () => props.text,
  (newValue) => {
    console.log("Text changed to:", newValue);
  }
);
</script>
