<template>
  <div
    v-if="visible"
    ref="container"
    class="graph-page"
  >
    <GraphView
      v-if="layoutStore.graphFocusItemId"
      :itemId="layoutStore.graphFocusItemId"
      :height="containerHeight"
      :width="containerWidth"
    />
    <div
      v-else
      class="graph-page-empty"
    >
      {{ $t("select-file-for-graph") }}
    </div>
  </div>
</template>
<script setup lang="ts">
import GraphView from "src/components/leftmenu/GraphView.vue";
import { useLayoutStore } from "src/stores/layoutStore";
import { onBeforeUnmount, ref, watch } from "vue";

const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
});

const layoutStore = useLayoutStore();
const container = ref<HTMLElement>();
const containerHeight = ref(400);
const containerWidth = ref(600);

let resizeObserver: ResizeObserver | null = null;

function setupResizeObserver() {
  resizeObserver?.disconnect();
  if (container.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height - 40;
        containerWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(container.value);
  }
}

// Re-attach ResizeObserver whenever visibility toggles on,
// because v-if destroys and re-creates the container DOM element.
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      // nextTick not needed — Vue updates the ref before the watcher runs
      // but we use a microtask to ensure the DOM element is fully inserted
      queueMicrotask(() => setupResizeObserver());
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>
<style scoped lang="scss">
.graph-page {
  width: 100%;
  height: 100%;
  background: var(--q-dark-page);
}

.graph-page-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--q-text-muted);
  font-size: 0.875rem;
}
</style>
