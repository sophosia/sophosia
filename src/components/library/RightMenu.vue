<template>
  <q-tabs
    dense
    indicator-color="transparent"
    active-color="primary"
    model-value="metaInfoTab"
    style="background: var(--color-rightmenu-tabs-bkgd)"
  >
    <q-tab
      name="metaInfoTab"
      icon="mdi-information-outline"
      :ripple="false"
    >
      <q-tooltip>{{ $t("info") }}</q-tooltip>
    </q-tab>
  </q-tabs>
  <!-- q-tab height 36px -->
  <q-tab-panels
    style="
      height: calc(100% - 36px);
      background: var(--color-rightmenu-tab-panel-bkgd);
    "
    model-value="metaInfoTab"
  >
    <q-tab-panel
      name="metaInfoTab"
      class="q-pa-none"
    >
      <MetaInfoTab :project="(projectStore.selected[0] as Project)" />
    </q-tab-panel>
  </q-tab-panels>
</template>
<script setup lang="ts">
import MetaInfoTab from "../MetaInfoTab.vue";
import { Project } from "src/backend/database";
import { useProjectStore } from "src/stores/projectStore";
const projectStore = useProjectStore();
</script>
