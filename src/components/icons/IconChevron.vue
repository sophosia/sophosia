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
        :class="[
          { 'icon-hovered': hovered },
          `direction-${direction}`,
          { 'is-expanded': expanded }
        ]"
      >
        <polyline
          points="9 18 15 12 9 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
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
  direction?: "right" | "down" | "left" | "up";
  expanded?: boolean;
}

withDefaults(defineProps<Props>(), {
  size: 24,
  active: false,
  direction: "right",
  expanded: false,
});
</script>

<style scoped>
.icon-svg {
  transition: transform 200ms ease-out;
}

.direction-right {
  transform: rotate(0deg);
}

.direction-down {
  transform: rotate(90deg);
}

.direction-left {
  transform: rotate(180deg);
}

.direction-up {
  transform: rotate(-90deg);
}

.is-expanded.direction-right {
  transform: rotate(90deg);
}

.icon-hovered {
  transform: translateX(2px);
}

.direction-down.icon-hovered {
  transform: rotate(90deg) translateX(2px);
}

.direction-left.icon-hovered {
  transform: rotate(180deg) translateX(2px);
}

.direction-up.icon-hovered {
  transform: rotate(-90deg) translateX(2px);
}
</style>
