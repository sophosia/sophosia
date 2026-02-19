<template>
  <div
    class="tab row justify-between items-center"
    :class="{ 'tab-active': active, 'tab-visible': page.visible }"
  >
    <div class="row items-center">
      <component
        :is="iconComponent"
        width="14"
        height="14"
        class="q-mr-xs"
      />
      <div class="tab-label ellipsis">
        {{ specialPages.includes(page.label) ? $t(page.label) : page.label }}
      </div>
    </div>
    <q-btn
      @click.stop="$emit('close')"
      padding="none"
      flat
      size="sm"
      class="tab-close-btn"
    >
      <Xmark width="14" height="14" />
    </q-btn>
    <slot name="menu"></slot>
  </div>
</template>
<script setup lang="ts">
import { PageType, type Page } from "src/backend/database";
import { PropType, computed } from "vue";
import {
  BookStack,
  Notes,
  HelpCircle,
  Settings,
  OpenBook,
  Page as PageIcon,
  DesignPencil,
  Puzzle,
  Folder,
  ShareAndroid,
  Xmark,
} from "@iconoir/vue";

const props = defineProps({
  page: { type: Object as PropType<Page>, required: true },
  active: { type: Boolean, required: true },
});

const emit = defineEmits(["close"]);
const specialPages = ["library", "help", "settings", "notebook", "related-items", "workspace"];

const iconComponent = computed(() => {
  switch (props.page.type) {
    case PageType.LibraryPage:
      return BookStack;
    case PageType.NotebookPage:
      return Notes;
    case PageType.HelpPage:
      return HelpCircle;
    case PageType.SettingsPage:
      return Settings;
    case PageType.ReaderPage:
      return OpenBook;
    case PageType.NotePage:
      return PageIcon;
    case PageType.ExcalidrawPage:
      return DesignPencil;
    case PageType.PluginPage:
      return Puzzle;
    case PageType.GraphPage:
      return ShareAndroid;
    case PageType.WorkspacePage:
      return Folder;
    default:
      return PageIcon;
  }
});
</script>
<style scoped lang="scss">
.tab {
  background: var(--color-layout-base-bkgd);
  color: var(--q-text-muted);
  padding: 0 8px;
  min-width: 10rem;
  height: 100%;
  border-radius: 6px 6px 0 0;
  box-shadow: 0 0 0 1px var(--q-edge);
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: var(--color-layout-active-tab-fore);
    background: var(--q-hover);
  }
}

.tab-label {
  font-size: 0.8125rem;
  font-weight: 500;
  width: 6rem;
}

.tab-visible {
  color: var(--color-layout-active-tab-fore);
}

.tab-active {
  border-bottom: 2px solid var(--q-primary);
}

.tab-close-btn {
  opacity: 0.4;
  border-radius: 4px;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 1;
  }
}
</style>
