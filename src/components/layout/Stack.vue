<template>
  <!-- the class stack is only for searching -->
  <TabContainer
    class="tab-container"
    :enableCrossWindowDragAndDrop="enableCrossWindowDragAndDrop"
    :pages="stack.children"
    @movePage="(page: Page, id: string, pos: 'before' | 'after', fromWindow: string) => movePage(page, id, pos, fromWindow)"
  />
  <div class="page-container">
    <PageContainer
      v-if="stack.children.length > 0"
      :asyncPages="asyncPages"
      :pages="stack.children"
      :enableCrossWindowDragAndDrop="enableCrossWindowDragAndDrop"
      @moveToStack="(page: Page, pos: 'center' | 'left' | 'right'| 'top' | 'bottom', fromWindow: string) => moveToStack(page, pos, fromWindow)"
    />
    <EmptyStack
      v-else
      @openPage="(page) => layoutStore.openPage(page)"
    />
  </div>
</template>
<script setup lang="ts">
import { listen } from "@tauri-apps/api/event";
import { type } from "@tauri-apps/api/os";
import { WebviewWindow } from "@tauri-apps/api/window";
import { type Page, type Stack } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, onBeforeUnmount, onMounted, ref, watchEffect } from "vue";
import EmptyStack from "./EmptyStack.vue";
import PageContainer from "./PageContainer.vue";
import TabContainer from "./TabContainer.vue";
const props = defineProps({
  stack: { type: Object as PropType<Stack>, required: true },
  asyncPages: { type: Object as PropType<Map<string, any>>, required: true },
});
const layoutStore = useLayoutStore();
const enableCrossWindowDragAndDrop = ref(false);
let unlisten: () => void;
onMounted(async () => {
  unlisten = await listen("closePage", (ev) => {
    const id = ev.payload as string;
    layoutStore.closePage(id);
  });
  enableCrossWindowDragAndDrop.value = "Linux" === (await type());
});

onBeforeUnmount(() => {
  unlisten();
});

watchEffect(refresh);

function movePage(
  page: Page,
  id: string,
  pos: "before" | "after",
  fromWindowId: string
) {
  layoutStore.removeNode(page.id);
  layoutStore.insertPage(page, id, pos);
  layoutStore.setActive(page.id);
  if (fromWindowId === layoutStore.windowId) return;
  const fromWindow = WebviewWindow.getByLabel(fromWindowId);
  fromWindow?.emit("closePage", page.id);
}

function moveToStack(
  page: Page,
  pos: "center" | "left" | "right" | "top" | "bottom",
  fromWindowId: string
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
    const pages = props.stack.children;
    const lastPageId = pages[pages.length - 1].id;
    layoutStore.insertPage(page, lastPageId, "after");
  }
  layoutStore.setActive(page.id);
  if (fromWindowId === layoutStore.windowId) return;
  const fromWindow = WebviewWindow.getByLabel(fromWindowId);
  fromWindow?.emit("closePage", page.id);
}

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
  for (let i = layoutStore.historyItemIds.length - 1; i >= 0; i--) {
    const index = pages.findIndex(
      (page) => page.id === layoutStore.historyItemIds[i]
    );
    if (index > -1) {
      pages[index].visible = true;
      return;
    }
  }
  if (pages.length > 0) pages[0].visible = true;
}
</script>
<style scoped lang="scss">
.page-container {
  position: absolute;
  width: 100%;
  height: calc(100% - 44px);
}
.tab-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  background: var(--color-layout-header-bkgd);
  height: 44px;
}
</style>
