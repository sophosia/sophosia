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
          class="help-circle"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="1.5"
        />
        <path
          class="help-mark"
          :class="{ 'mark-hover': hovered }"
          d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          class="help-dot"
          :class="{ 'dot-hover': hovered }"
          cx="12"
          cy="17"
          r="0.5"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="1"
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
  transform: scale(1.05);
}

.help-circle {
  transition: stroke-width 150ms ease-out;
}

.icon-hovered .help-circle {
  stroke-width: 2;
}

.help-mark {
  transition: transform 150ms ease-out;
  transform-origin: center;
}

.mark-hover {
  transform: translateY(-1px);
}

.help-dot {
  transition: transform 150ms ease-out, r 150ms ease-out;
}

.dot-hover {
  transform: scale(1.5);
}
</style>
