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
        <!-- Folder back -->
        <path
          class="folder-back"
          :class="{ 'folder-open': hovered }"
          d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Folder front flap -->
        <path
          class="folder-front"
          :class="{ 'folder-open': hovered }"
          d="M2 8H22"
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
.folder-back,
.folder-front {
  transition: transform 200ms ease-out;
  transform-origin: bottom center;
}

.folder-front.folder-open {
  transform: translateY(-2px) rotateX(-15deg);
}

.folder-back.folder-open {
  transform: scaleY(1.05);
}
</style>
