<template>
  <div style="width: 100%; height: 100vh">
    <LayoutComponent v-model:layout="layout" />
  </div>
</template>
<script setup lang="ts">
import { nanoid } from "nanoid";
import type { Layout, PageType } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, computed } from "vue";
import LayoutComponent from "./LayoutComponent";
const layoutStore = useLayoutStore();
const props = defineProps({
  pageId: { type: String },
  pageType: { type: String as PropType<PageType> },
  pageLabel: { type: String },
});
console.log("layout container", layoutStore.layout);
const layout = computed({
  get() {
    // if not empty, return the layout
    if (layoutStore.layout) return layoutStore.layout;
    else {
      // if empty, construct the layout first using the page info
      const _layout = {
        id: nanoid(),
        type: "stack",
        children: [
          {
            id: props.pageId,
            type: props.pageType,
            label: props.pageLabel,
          },
        ],
      } as Layout;
      layout.value = _layout;
      console.log("returning layout", _layout);
      return _layout;
    }
  },
  set(newLayout: Layout) {
    layoutStore.layouts.set(layoutStore.windowId, newLayout);
  },
});
</script>
