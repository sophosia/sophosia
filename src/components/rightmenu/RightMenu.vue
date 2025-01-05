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
    class="right-menu-panel"
    model-value="metaInfoTab"
  >
    <q-tab-panel
      name="metaInfoTab"
      class="q-pa-none"
    >
      <MetaInfoTab
        :project="currentProject"
        @updatedProjectId="(oldId:string, newId: string) => setActivePage(oldId, newId)"
      />
    </q-tab-panel>
  </q-tab-panels>
</template>
<script setup lang="ts">
import { PageType } from "sophosia";
import MetaInfoTab from "./MetaInfoTab.vue";
import { Project } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { watchEffect, ref } from "vue";
const layoutStore = useLayoutStore();
const projectStore = useProjectStore();
const currentProject = ref<Project>();
const updatedProjectId = ref<String>("");
watchEffect(async () => {
  const itemId = layoutStore.currentItemId;
  if (itemId == updatedProjectId.value) return;
  const page = layoutStore.findPage((page) => page.id == itemId);
  if (!page) return;
  if (page!.type == PageType.LibraryPage) {
    currentProject.value = projectStore.selected[0] as Project;
  } else if (page.type == PageType.ReaderPage) {
    currentProject.value = projectStore.getProject(itemId);
  } else if (
    page.type == PageType.NotePage ||
    page.type == PageType.ExcalidrawPage
  ) {
    const note = await projectStore.getNoteFromDB(itemId);
    currentProject.value = projectStore.getProject(note!.projectId);
  }
});

function setActivePage(oldProjectId: string, newProjectId: string) {
  updatedProjectId.value = newProjectId;
  const itemId = layoutStore.currentItemId;
  const page = layoutStore.findPage((page) => page.id == itemId);
  if (!page) return;
  if (
    page.type == PageType.ReaderPage ||
    page.type == PageType.NotePage ||
    page.type == PageType.ExcalidrawPage
  )
    layoutStore.setActive(page.id.replace(oldProjectId, newProjectId));
}
</script>
