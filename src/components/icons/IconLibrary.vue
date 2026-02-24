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
        <!-- Books on shelf -->
        <rect
          class="book book-1"
          :class="{ 'book-hover': hovered }"
          x="3"
          y="4"
          width="3"
          height="14"
          rx="0.5"
          fill="currentColor"
          opacity="0.9"
        />
        <rect
          class="book book-2"
          :class="{ 'book-hover': hovered }"
          x="7"
          y="6"
          width="3"
          height="12"
          rx="0.5"
          fill="currentColor"
          opacity="0.7"
        />
        <rect
          class="book book-3"
          :class="{ 'book-hover': hovered }"
          x="11"
          y="3"
          width="3"
          height="15"
          rx="0.5"
          fill="currentColor"
          opacity="0.85"
        />
        <rect
          class="book book-4"
          :class="{ 'book-hover': hovered }"
          x="15"
          y="5"
          width="3"
          height="13"
          rx="0.5"
          fill="currentColor"
          opacity="0.75"
        />
        <rect
          class="book book-5"
          :class="{ 'book-hover': hovered }"
          x="19"
          y="7"
          width="2"
          height="11"
          rx="0.5"
          fill="currentColor"
          opacity="0.6"
        />
        <!-- Shelf -->
        <line
          x1="2"
          y1="19"
          x2="22"
          y2="19"
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
.book {
  transition: transform 150ms ease-out, opacity 150ms ease-out;
  transform-origin: bottom center;
}

.book-1.book-hover {
  transform: translateY(-2px) rotate(-3deg);
}

.book-2.book-hover {
  transform: translateY(-1px);
  transition-delay: 30ms;
}

.book-3.book-hover {
  transform: translateY(-3px);
  transition-delay: 60ms;
}

.book-4.book-hover {
  transform: translateY(-1px) rotate(2deg);
  transition-delay: 90ms;
}

.book-5.book-hover {
  transform: translateY(-2px);
  transition-delay: 120ms;
}
</style>
