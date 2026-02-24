<template>
  <IconBase :size="size" :active="active">
    <template #default="{ hovered }">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="icon-svg"
        :class="{ 'icon-hovered': hovered }"
      >
        <circle
          class="search-circle"
          cx="11"
          cy="11"
          r="7"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <line
          class="search-handle"
          x1="16.5"
          y1="16.5"
          x2="21"
          y2="21"
          stroke="currentColor"
          stroke-width="1.5"
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
.icon-svg {
  transition: transform 200ms ease-out;
}

.icon-hovered {
  transform: scale(1.1) rotate(-10deg);
}

.search-circle,
.search-handle {
  transition: stroke-width 150ms ease-out;
}

.icon-hovered .search-circle,
.icon-hovered .search-handle {
  stroke-width: 2;
}
</style>
