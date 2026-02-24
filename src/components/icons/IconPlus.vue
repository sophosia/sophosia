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
        <line
          class="plus-line"
          x1="12"
          y1="5"
          x2="12"
          y2="19"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
        <line
          class="plus-line"
          x1="5"
          y1="12"
          x2="19"
          y2="12"
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
.icon-svg {
  transition: transform 200ms ease-out;
}

.icon-hovered {
  transform: rotate(90deg) scale(1.1);
}

.plus-line {
  transition: stroke-width 150ms ease-out;
}

.icon-hovered .plus-line {
  stroke-width: 2.5;
}
</style>
