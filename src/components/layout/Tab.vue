<template>
  <div
    class="tab row justify-between items-center"
    :class="{ 'tab-active': active }"
  >
    <div
      style="width: 4rem"
      class="ellipsis"
    >
      {{ page.label }}
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
</script>
<style scoped lang="scss">
.tab {
  background: var(--color-layout-base-bkgd);
  padding: 0 5px 0 5px;
  margin: 1px;
  min-width: 7rem;
  height: 100%;
  border-radius: 4px 4px 0 0;

  &:hover {
    background: var(--q-menu-highlight);
  }
}
.tab-active {
  background: var(--color-layout-active-tab-bkgd);
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.2);
}
</style>
