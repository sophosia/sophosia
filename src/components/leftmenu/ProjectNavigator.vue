<template>
  <div class="project-nav-panel">
    <div class="project-nav-header">
      <span class="project-nav-title">{{ $t("openedProjects") }}</span>
      <q-btn
        class="project-nav-add-btn"
        flat
        dense
        square
        padding="xs"
        :ripple="false"
        @click="createProject"
      >
        <Plus width="14" height="14" />
        <q-tooltip>{{ $t("add", { type: $t("project") }) }}</q-tooltip>
      </q-btn>
    </div>
    <div class="project-nav-content">
      <div
        v-if="projectStore.openedProjects.length === 0"
        class="project-nav-empty"
      >
        <span>{{ $t("empty") }}</span>
      </div>
      <ProjectTree v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProjectTree from "./ProjectTree.vue";
import { Plus } from "@iconoir/vue";
import { useProjectStore } from "src/stores/projectStore";
import { useProjectActions } from "src/composables/useProjectActions";

const projectStore = useProjectStore();
const { createProject: doCreateProject } = useProjectActions();

function createProject() {
  doCreateProject(
    () => "library",
    () => (name: string) =>
      projectStore.projects.some(
        (p) => p.label.toLowerCase() === name.toLowerCase()
      )
  );
}
</script>

<style lang="scss" scoped>
.project-nav-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.project-nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  flex-shrink: 0;
}

.project-nav-title {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--q-text-muted);
}

.project-nav-add-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--q-text-muted);
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: var(--q-reg-text);
    background: var(--q-hover);
  }
}

.project-nav-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.project-nav-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--q-text-muted);
  font-size: 0.8125rem;
  font-style: italic;
  user-select: none;
}
</style>
