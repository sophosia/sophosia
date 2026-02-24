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
        <!-- Arrow up -->
        <path
          class="export-arrow"
          :class="{ 'arrow-hover': hovered }"
          d="M12 3L12 15"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          class="export-arrow"
          :class="{ 'arrow-hover': hovered }"
          d="M7 8L12 3L17 8"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Base box -->
        <path
          class="export-box"
          d="M3 15V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V15"
          stroke="currentColor"
          stroke-width="1.5"
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
}

withDefaults(defineProps<Props>(), {
  size: 24,
  active: false,
});
</script>

<style scoped>
.export-arrow {
  transition: transform 200ms ease-out;
}

.arrow-hover {
  transform: translateY(-3px);
}

.export-box {
  transition: transform 150ms ease-out;
}
</style>
