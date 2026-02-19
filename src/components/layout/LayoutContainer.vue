<template>
  <div style="width: 100%; height: 100%">
    <LayoutComponent v-model:layout="layout" />
  </div>
</template>
<script setup lang="ts">
import type { Layout, Page, PageType } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, computed } from "vue";
import LayoutComponent from "./LayoutComponent";
const layoutStore = useLayoutStore();
const props = defineProps({
  id: { type: String },
  type: { type: String as PropType<PageType> },
  label: { type: String },
});
const layout = computed({
  get() {
    if (layoutStore.layout) {
      // if not empty, return the layout
      return layoutStore.layout;
    } else {
      // if empty, construct the layout first using the page info
      const stack = layoutStore.wrappedInStack(props as Page);
      layoutStore.layouts.set(layoutStore.windowId, stack);
      return stack;
    }
  },
  set(newLayout: Layout) {
    layoutStore.layouts.set(layoutStore.windowId, newLayout);
  },
});
</script>
