<template>
  <q-splitter
    style="background: var(--color-projecttree-bkgd)"
    horizontal
    emit-immediately
    :limits="[36, maxHeight]"
    unit="px"
    separator-style="background: var(--q-edge)"
    :separator-class="{
      'q-splitter-separator-horizontal': isGraphViewOpened && isTreeOpened,
      'no-pointer-events': !isGraphViewOpened || !isTreeOpened,
    }"
    v-model="treeSize"
    ref="root"
  >
    <template v-slot:before>
      <!-- expansion item title height: 36px -->
      <q-expansion-item
        v-model="isTreeOpened"
        dense
        dense-toggle
        expand-separator
        default-opened
        hide-expand-icon
        header-class="q-pa-none q-ma-none"
        header-style="height: 36px"
        :duration="0"
      >
        <template v-slot:header="props">
          <q-item-section
            side
            class="q-pa-none no-shadow"
          >
            <q-icon
              :name="props.expanded ? 'mdi-menu-down' : 'mdi-menu-right'"
            />
          </q-item-section>
          <q-item-section>
            <div
              style="font-size: 1rem; width: 100%"
              class="text-bold non-selectable ellipsis"
            >
              {{ $t("active-projects") }}
            </div>
          </q-item-section>
        </template>
        <div
          :style="`height: ${treeSize - 36}px; overflow-y: auto`"
          class="q-px-xs"
        >
          <ProjectTree />
        </div>
      </q-expansion-item>
    </template>

    <template v-slot:after>
      <q-expansion-item
        v-model="isGraphViewOpened"
        dense
        dense-toggle
        switch-toggle-side
        expand-separator
        hide-expand-icon
        header-class="q-pa-none q-ma-none ellipsis"
        :duration="0"
      >
        <template v-slot:header="props">
          <q-item-section
            side
            class="q-pa-none"
          >
            <q-icon
              :name="props.expanded ? 'mdi-menu-down' : 'mdi-menu-right'"
            />
          </q-item-section>
          <q-item-section>
            <div
              style="font-size: 1rem; width: 100%"
              class="text-bold non-selectable ellipsis"
            >
              {{ $t("related-items") }}
            </div>
          </q-item-section>
          <q-item-section side>
            <q-btn
              flat
              :ripple="false"
              size="sm"
              padding="none"
              class="q-mr-xs"
              icon="mdi-refresh"
              @click.stop="graphview?.reload()"
            >
              <q-tooltip>{{ $t("refresh-graphview") }}</q-tooltip>
            </q-btn>
          </q-item-section>
        </template>
        <GraphView
          v-if="
            isGraphViewOpened &&
            !['library', 'settings', 'help'].includes(layoutStore.currentItemId)
          "
          :itemId="layoutStore.currentItemId"
          :height="treeSize"
          ref="graphview"
        />
      </q-expansion-item>
    </template>
  </q-splitter>
</template>

<script setup lang="ts">
// types
import { onMounted, ref, watch } from "vue";
import { QSplitter } from "quasar";
// components
import GraphView from "./GraphView.vue";
import ProjectTree from "./ProjectTree.vue";

import { useQuasar } from "quasar";
import { useLayoutStore } from "src/stores/layoutStore";

const layoutStore = useLayoutStore();
const $q = useQuasar();

const root = ref<QSplitter | null>(null);
const maxHeight = ref(36);
const maxWidth = ref(0);
const treeSize = ref(36);
const isTreeOpened = ref(true);

// graphview
const graphview = ref<InstanceType<typeof GraphView> | null>(null);
const isGraphViewOpened = ref(false);

onMounted(() => {
  if (!root.value) return;
  maxWidth.value = root.value.$el.offsetWidth;
  maxHeight.value = root.value.$el.offsetHeight - 36;
  treeSize.value = maxHeight.value;
});

watch(isTreeOpened, (opened: boolean) => {
  if (!opened) treeSize.value = 36;
  else if (opened && !isTreeOpened.value) treeSize.value = maxHeight.value;
  else treeSize.value = maxHeight.value / 2;
});

watch(isGraphViewOpened, (opened: boolean) => {
  if (isTreeOpened.value) {
    if (opened) treeSize.value = maxHeight.value / 2;
    else treeSize.value = maxHeight.value;
  }
});

watch(
  () => $q.screen.height,
  () => {
    if (!root.value) return;
    maxHeight.value = root.value.$el.offsetHeight - 36;
    if (!isGraphViewOpened.value) treeSize.value = maxHeight.value;
  }
);
</script>
<style>
.q-splitter__panel {
  overflow: hidden;
}
</style>
