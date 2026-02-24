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
        <!-- Main trunk line -->
        <path
          class="tree-trunk"
          d="M6 3V16"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Branch 1 -->
        <path
          class="tree-branch branch-1"
          :class="{ 'branch-hover': hovered }"
          d="M6 6H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Leaf 1 -->
        <rect
          class="tree-leaf leaf-1"
          :class="{ 'leaf-hover': hovered }"
          x="11"
          y="4"
          width="8"
          height="4"
          rx="1"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.8"
        />
        <!-- Branch 2 -->
        <path
          class="tree-branch branch-2"
          :class="{ 'branch-hover': hovered }"
          d="M6 11H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Leaf 2 -->
        <rect
          class="tree-leaf leaf-2"
          :class="{ 'leaf-hover': hovered }"
          x="11"
          y="9"
          width="8"
          height="4"
          rx="1"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.6"
        />
        <!-- Branch 3 -->
        <path
          class="tree-branch branch-3"
          :class="{ 'branch-hover': hovered }"
          d="M6 16H10"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <!-- Leaf 3 -->
        <rect
          class="tree-leaf leaf-3"
          :class="{ 'leaf-hover': hovered }"
          x="11"
          y="14"
          width="8"
          height="4"
          rx="1"
          stroke="currentColor"
          stroke-width="1.5"
          opacity="0.5"
        />
        <!-- Bottom base -->
        <line
          x1="4"
          y1="20"
          x2="20"
          y2="20"
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
.tree-trunk,
.tree-branch {
  transition: stroke-width 150ms ease-out;
}

.tree-leaf {
  transition: transform 150ms ease-out, opacity 150ms ease-out;
}

.leaf-1.leaf-hover {
  transform: translateX(2px);
  opacity: 1;
}

.leaf-2.leaf-hover {
  transform: translateX(2px);
  opacity: 0.8;
  transition-delay: 50ms;
}

.leaf-3.leaf-hover {
  transform: translateX(2px);
  opacity: 0.7;
  transition-delay: 100ms;
}

.branch-hover {
  stroke-width: 2;
}
</style>
