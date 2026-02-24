<template>
  <IconBase :size="size" :active="active">
    <template #default="{ hovered }">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          class="menu-line line-1"
          :class="{ 'line-hover': hovered }"
          x1="3"
          y1="6"
          x2="21"
          y2="6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <line
          class="menu-line line-2"
          :class="{ 'line-hover': hovered }"
          x1="3"
          y1="12"
          x2="21"
          y2="12"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <line
          class="menu-line line-3"
          :class="{ 'line-hover': hovered }"
          x1="3"
          y1="18"
          x2="21"
          y2="18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    </template>
  </IconBase>
</template>

<script setup lang="ts">
import IconBase from "./IconBase.vue";

interface Props {
  size?: number;
  active?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 24,
  active: false,
});
</script>

<style scoped>
.menu-line {
  transition: transform 150ms ease-out, opacity 150ms ease-out;
  transform-origin: center;
}

.line-1.line-hover {
  transform: translateX(2px);
}

.line-2.line-hover {
  transform: scaleX(0.8);
  transition-delay: 30ms;
}

.line-3.line-hover {
  transform: translateX(-2px);
  transition-delay: 60ms;
}
</style>
