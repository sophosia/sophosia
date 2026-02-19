<template>
  <div
    v-if="visible"
    class="workspace-page"
  >
    <div class="workspace-page-inner">
      <div class="workspace-header">
        <h3
          class="workspace-title"
          data-cy="workspace-title"
        >{{ $t("workspace") }}</h3>
      </div>
      <div class="workspace-list-section">
        <q-list
          class="workspace-items"
          data-cy="workspace-list"
        >
          <q-item
            v-for="ws in workspaces"
            :key="ws.path"
            clickable
            class="workspace-item"
            :class="{ 'workspace-item-active': ws.path === currentPath }"
            data-cy="workspace-item"
            @click="switchWorkspace(ws.path)"
          >
            <q-item-section avatar>
              <Folder
                width="20"
                height="20"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="workspace-item-label">
                {{ ws.label }}
              </q-item-label>
              <q-item-label class="workspace-item-path">
                {{ ws.path }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                dense
                flat
                :ripple="false"
                class="workspace-action-btn"
              >
                <MoreVert
                  width="16"
                  height="16"
                />
                <q-popup-proxy>
                  <WorkspaceMenu
                    @showInExplorer="showInExplorer(ws.path)"
                    @removePath="removeStoragePath(ws.path)"
                    @changePath="changeStoragePath(ws.path)"
                  />
                </q-popup-proxy>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <div class="workspace-add-section">
        <q-btn
          flat
          no-caps
          class="workspace-add-btn"
          data-cy="workspace-add-btn"
          @click="addWorkspace"
        >
          <Plus
            width="18"
            height="18"
            class="q-mr-sm"
          />
          {{ $t("add-workspace") }}
        </q-btn>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { open } from "@tauri-apps/api/dialog";
import { renameFile } from "@tauri-apps/api/fs";
import { homeDir, sep } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";
import { Config, db } from "src/backend/database";
import { computed } from "vue";
import { Folder, MoreVert, Plus } from "@iconoir/vue";
import WorkspaceMenu from "src/components/welcome/WorkspaceMenu.vue";

defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
});

const currentPath = computed(() => db.config.storagePath);

const workspaces = computed(() => {
  const array = [];
  for (const path of db.config.storagePaths) {
    const splits = path.split(sep);
    array.push({ label: splits[splits.length - 1], path: path });
  }
  return array;
});

async function switchWorkspace(path: string) {
  await db.setConfig({ storagePath: path } as Config);
}

async function addWorkspace() {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath: await homeDir(),
  });
  if (!result) return;
  const newPath = result as string;
  const storagePaths = [...db.config.storagePaths, newPath];
  await db.setConfig({ storagePath: newPath, storagePaths } as Config);
}

async function showInExplorer(path: string) {
  if (path) await invoke("show_in_folder", { path });
}

async function removeStoragePath(path: string) {
  let storagePath = db.config.storagePath;
  let storagePaths = db.config.storagePaths.filter((p) => p !== path);
  if (storagePath === path) storagePath = storagePaths[0] || "";
  await db.setConfig({ storagePath, storagePaths } as Config);
}

async function changeStoragePath(oldPath: string) {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath: await homeDir(),
  });
  if (!result) return;
  const newPath = result as string;
  await renameFile(oldPath, newPath);
  const paths = db.config.storagePaths;
  const index = paths.indexOf(oldPath);
  if (index > -1) paths[index] = newPath;
  await db.setConfig({ storagePath: newPath, storagePaths: paths } as Config);
}
</script>
<style scoped lang="scss">
.workspace-page {
  width: 100%;
  height: 100%;
  background: var(--q-dark-page);
  overflow-y: auto;
}

.workspace-page-inner {
  max-width: 600px;
  margin: 0 auto;
  padding: 48px 24px;
}

.workspace-header {
  margin-bottom: 24px;
}

.workspace-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--q-reg-text);
}

.workspace-items {
  border-radius: 8px;
  overflow: hidden;
}

.workspace-item {
  border-radius: 8px;
  margin-bottom: 4px;
  transition: background-color 0.15s ease;

  &:hover {
    background: var(--q-hover);
  }
}

.workspace-item-active {
  background: var(--q-main-highlight);
}

.workspace-item-label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--q-reg-text);
}

.workspace-item-path {
  font-size: 0.8125rem;
  color: var(--q-text-muted);
  word-break: break-all;
}

.workspace-action-btn {
  color: var(--q-text-muted);
  border-radius: 6px;

  &:hover {
    color: var(--q-reg-text);
  }
}

.workspace-add-section {
  margin-top: 16px;
}

.workspace-add-btn {
  color: var(--q-text-muted);
  border: 1px dashed var(--q-border);
  border-radius: 8px;
  width: 100%;
  padding: 12px;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover {
    color: var(--q-primary);
    border-color: var(--q-primary);
  }
}
</style>
