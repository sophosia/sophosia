<template>
  <!-- the class stack is only for searching -->
  <TabContainer
    class="tab-container"
    :pages="stack.children"
    @movePage="(page: Page, id: string, pos: 'before' | 'after') => movePage(page, id, pos)"
  />
  <div class="page-container">
    <PageContainer
      :asyncPages="asyncPages"
      :pages="stack.children"
      @moveToStack="(page: Page, pos: 'center' | 'left' | 'right'| 'top' | 'bottom') => moveToStack(page, pos)"
    />
  </div>
</template>
<script setup lang="ts">
import { type Page, type Stack } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, watchEffect } from "vue";
import PageContainer from "./PageContainer.vue";
import TabContainer from "./TabContainer.vue";
const props = defineProps({
  stack: { type: Object as PropType<Stack>, required: true },
  asyncPages: { type: Object as PropType<Map<string, any>>, required: true },
});
const emit = defineEmits(["onUpdate:stack"]);
const layoutStore = useLayoutStore();

/**
 * Move a node to a position relative to the target node with id
 * @param node - the node to be moved
 * @param id - the id of the target node
 * @param pos - position relative to the target node
 */
function movePage(page: Page, id: string, pos: "before" | "after") {
  layoutStore.removeNode(page.id);
  layoutStore.insertPage(page, id, pos);
}

/**
 * Move a node to a position relative to the target stack with stackId
 * @param node - the node to be moved
 * @param stackId - the id of the target stack
 * @param pos - position relative to the target node
 */
function moveToStack(
  page: Page,
  pos: "center" | "left" | "right" | "top" | "bottom"
) {
  layoutStore.removeNode(page.id);
  if (pos === "left") {
    const stack = layoutStore.wrappedInStack(page);
    const row = layoutStore.wrappedInRow(stack, props.stack);
    layoutStore.replaceNode(row, props.stack.id);
  } else if (pos === "right") {
    const stack = layoutStore.wrappedInStack(page);
    const row = layoutStore.wrappedInRow(props.stack, stack);
    layoutStore.replaceNode(row, props.stack.id);
  } else if (pos === "top") {
    const stack = layoutStore.wrappedInStack(page);
    const col = layoutStore.wrappedInCol(stack, props.stack);
    layoutStore.replaceNode(col, props.stack.id);
  } else if (pos === "bottom") {
    const stack = layoutStore.wrappedInStack(page);
    const col = layoutStore.wrappedInCol(props.stack, stack);
    layoutStore.replaceNode(col, props.stack.id);
  } else {
    // center
    const pages = props.stack.children;
    const lastPageId = pages[pages.length - 1].id;
    layoutStore.insertPage(page, lastPageId, "after");
  }
}

/**
 * Set visibility of components after moving them around and trigger refresh of the tree
 */
function refresh() {
  const pages = props.stack.children;
  let setVisible = false;
  for (const page of pages) {
    page.visible = false;
    if (page.id === layoutStore.currentItemId) {
      page.visible = true;
      setVisible = true;
    }
  }
  if (setVisible) return;
  for (let i = layoutStore.historyItemId.length - 1; i >= 0; i--) {
    const index = pages.findIndex(
      (page) => page.id === layoutStore.historyItemId[i]
    );
    if (index > -1) {
      pages[index].visible = true;
      return;
    }
  }
  // if cannot find in history, just make first page visible
  pages[0].visible = true;
}

watchEffect(() => {
  refresh();
  emit("onUpdate:stack", props.stack);
  console.log("layout", layoutStore.layout);
});
</script>
<style scoped lang="scss">
.page-container {
  position: absolute;
  width: 100%;
  height: calc(100% - 30px);
}
.tab-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--color-layout-header-bkgd);
  height: 30px;
}
</style>
