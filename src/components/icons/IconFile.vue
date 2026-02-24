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
        <!-- File body -->
        <path
          class="file-body"
          :class="{ 'file-hover': hovered }"
          d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Fold corner -->
        <path
          class="file-corner"
          :class="{ 'file-hover': hovered }"
          d="M14 2V8H20"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Text lines -->
        <line
          class="file-line line-1"
          :class="{ 'file-hover': hovered }"
          x1="8"
          y1="13"
          x2="16"
          y2="13"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.6"
        />
        <line
          class="file-line line-2"
          :class="{ 'file-hover': hovered }"
          x1="8"
          y1="17"
          x2="14"
          y2="17"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.4"
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
.file-body,
.file-corner {
  transition: transform 150ms ease-out;
  transform-origin: bottom left;
}

.file-body.file-hover {
  transform: translateY(-2px);
}

.file-corner.file-hover {
  transform: translateY(-2px);
}

.file-line {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.line-1.file-hover {
  opacity: 0.8;
  transform: scaleX(1.05);
  transition-delay: 50ms;
}

.line-2.file-hover {
  opacity: 0.6;
  transform: scaleX(1.1);
  transition-delay: 100ms;
}
</style>
