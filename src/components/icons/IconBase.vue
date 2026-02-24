<template>
  <span
    class="icon-wrapper"
    :class="{ 'icon-active': active }"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <slot :hovered="hovered" :active="active" />
  </span>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  size?: number;
  active?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 24,
  active: false,
});

const hovered = ref(false);
</script>

<style scoped>
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: color var(--transition-normal);
}

.icon-wrapper:hover {
  color: var(--text-primary);
}

.icon-wrapper.icon-active {
  color: var(--accent-primary);
}
</style>
