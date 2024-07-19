<template>
  <div
    class="tab row justify-between items-center"
    :class="{ 'tab-active': active, 'tab-visible': page.visible }"
  >
    <div class="row items-center">
      <q-icon
        v-if="page.type === PageType.ReaderPage"
        size="xs"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
        >
          <title>book-open-blank-variant-outline</title>
          <path
            d="M12 21.5C10.65 20.65 8.2 20 6.5 20C4.85 20 3.15 20.3 1.75 21.05C1.65 21.1 1.6 21.1 1.5 21.1C1.25 21.1 1 20.85 1 20.6V6C1.6 5.55 2.25 5.25 3 5C4.11 4.65 5.33 4.5 6.5 4.5C8.45 4.5 10.55 4.9 12 6C13.45 4.9 15.55 4.5 17.5 4.5C18.67 4.5 19.89 4.65 21 5C21.75 5.25 22.4 5.55 23 6V20.6C23 20.85 22.75 21.1 22.5 21.1C22.4 21.1 22.35 21.1 22.25 21.05C20.85 20.3 19.15 20 17.5 20C15.8 20 13.35 20.65 12 21.5M11 7.5C9.64 6.9 7.84 6.5 6.5 6.5C5.3 6.5 4.1 6.65 3 7V18.5C4.1 18.15 5.3 18 6.5 18C7.84 18 9.64 18.4 11 19V7.5M13 19C14.36 18.4 16.16 18 17.5 18C18.7 18 19.9 18.15 21 18.5V7C19.9 6.65 18.7 6.5 17.5 6.5C16.16 6.5 14.36 6.9 13 7.5V19Z"
          />
        </svg>
      </q-icon>
      <q-icon
        v-else
        :name="iconName"
        size="xs"
      ></q-icon>
      <div
        style="font-size: 1rem; font-weight: 500; width: 6rem"
        class="ellipsis q-ml-xs"
      >
        {{ specialPages.includes(page.label) ? $t(page.label) : page.label }}
      </div>
    </div>
    <q-btn
      @click.stop="$emit('close')"
      icon="mdi-close"
      padding="none"
      flat
      size="sm"
    />
    <slot name="menu"></slot>
  </div>
</template>
<script setup lang="ts">
import { PageType, type Page } from "src/backend/database";
import { PropType } from "vue";

const props = defineProps({
  page: { type: Object as PropType<Page>, required: true },
  active: { type: Boolean, required: true },
});

const emit = defineEmits(["close"]);
const specialPages = ["library", "help", "settings", "notebook"];
let iconName = "";
switch (props.page.type) {
  case PageType.LibraryPage:
    iconName = "mdi-library-outline";
    break;
  case PageType.NotebookPage:
    iconName = "mdi-notebook-outline";
    break;
  case PageType.HelpPage:
    iconName = "mdi-help-circle-outline";
    break;
  case PageType.SettingsPage:
    iconName = "mdi-cog-outline";
    break;
  case PageType.NotePage:
    iconName = "mdi-language-markdown-outline";
    break;
  case PageType.ExcalidrawPage:
    iconName = "mdi-fountain-pen-tip";
    break;
  case PageType.PluginPage:
    iconName = "mdi-toy-brick-outline";
    break;
}
</script>
<style scoped lang="scss">
.tab {
  background: var(--color-layout-base-bkgd);
  color: grey;
  padding: 0 5px 0 5px;
  // margin: 1px;
  min-width: 10rem;
  height: 100%;
  border-radius: 4px 4px 0 0;
  // border-left: 1px solid var(--q-edge);
  // border-right: 1px solid var(--q-edge);
  box-shadow: 0 0 0 1px var(--q-edge);

  &:hover {
    color: var(--color-layout-active-tab-fore);
  }
}
.tab-visible {
  color: var(--color-layout-active-tab-fore);
}
.tab-active {
  border-bottom: 1px solid var(--q-primary);
}
</style>
