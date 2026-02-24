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
        <!-- Safe body -->
        <rect
          class="safe-body"
          :class="{ 'body-hover': hovered }"
          x="3"
          y="5"
          width="18"
          height="16"
          rx="2"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <!-- Safe door -->
        <rect
          class="safe-door"
          :class="{ 'door-hover': hovered }"
          x="6"
          y="8"
          width="12"
          height="10"
          rx="1"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.7"
        />
        <!-- Handle circle -->
        <circle
          class="safe-dial"
          :class="{ 'dial-hover': hovered }"
          cx="12"
          cy="13"
          r="2.5"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <!-- Handle line -->
        <line
          class="safe-handle"
          :class="{ 'handle-hover': hovered }"
          x1="12"
          y1="13"
          x2="14"
          y2="11"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Top edge -->
        <line
          x1="5"
          y1="5"
          x2="19"
          y2="5"
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
.safe-body,
.safe-door {
  transition: transform 200ms ease-out;
}

.safe-dial,
.safe-handle {
  transition: transform 300ms ease-out;
  transform-origin: center;
}

.dial-hover {
  transform: rotate(45deg);
}

.handle-hover {
  transform: rotate(45deg);
}

.body-hover {
  transform: scale(1.02);
}
</style>
