<template>
  <div
    class="tab row justify-between items-center"
    :class="{ 'tab-active': active, 'tab-visible': page.visible }"
  >
    <div
      style="width: 4rem"
      class="ellipsis"
    >
      {{ specialPages.includes(page.label) ? $t(page.label) : page.label }}
    </div>
    <q-btn
      @click.stop="$emit('close')"
      icon="mdi-close"
      padding="none"
      flat
      size="sm"
    />
  </div>
</template>
<script setup lang="ts">
import type { Page } from "src/backend/database";
import { PropType } from "vue";

const props = defineProps({
  page: { type: Object as PropType<Page>, required: true },
  active: { type: Boolean, required: true },
});
const emit = defineEmits(["close"]);
const specialPages = ["library", "help", "settings"];
</script>
<style scoped lang="scss">
.tab {
  background: var(--color-layout-base-bkgd);
  color: grey;
  padding: 0 5px 0 5px;
  margin: 1px;
  min-width: 7rem;
  height: 100%;
  border-radius: 4px 4px 0 0;

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
