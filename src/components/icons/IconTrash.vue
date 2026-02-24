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
        <!-- Lid -->
        <path
          class="trash-lid"
          :class="{ 'lid-hover': hovered }"
          d="M3 6H5H21"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          class="trash-lid"
          :class="{ 'lid-hover': hovered }"
          d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Body -->
        <path
          class="trash-body"
          :class="{ 'body-hover': hovered }"
          d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Lines -->
        <line
          class="trash-line"
          :class="{ 'line-hover': hovered }"
          x1="10"
          y1="11"
          x2="10"
          y2="17"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.7"
        />
        <line
          class="trash-line"
          :class="{ 'line-hover': hovered }"
          x1="14"
          y1="11"
          x2="14"
          y2="17"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.7"
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
.trash-lid {
  transition: transform 200ms ease-out;
  transform-origin: center bottom;
}

.lid-hover {
  transform: translateY(-3px) rotate(-8deg);
}

.trash-body {
  transition: transform 150ms ease-out;
  transform-origin: bottom center;
}

.body-hover {
  transform: scaleY(0.98);
}

.trash-line {
  transition: opacity 150ms ease-out;
}

.line-hover {
  opacity: 1;
}
</style>
