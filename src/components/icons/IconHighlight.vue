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
        <!-- Highlighter body -->
        <path
          class="highlighter-body"
          :class="{ 'body-hover': hovered }"
          d="M9.75 14.25L5.25 18.75"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          class="highlighter-tip"
          :class="{ 'tip-hover': hovered }"
          d="M12 3L21 12L16.5 16.5L12 21L7.5 16.5L3 12L12 3Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Highlight effect -->
        <rect
          class="highlight-rect"
          :class="{ 'rect-hover': hovered }"
          x="9"
          y="9"
          width="6"
          height="6"
          fill="currentColor"
          opacity="0.3"
          rx="1"
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
.highlighter-body,
.highlighter-tip {
  transition: transform 200ms ease-out;
  transform-origin: center;
}

.tip-hover {
  transform: rotate(-10deg) translateY(-2px);
}

.highlight-rect {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.rect-hover {
  opacity: 0.5;
  transform: scale(1.2);
}
</style>
