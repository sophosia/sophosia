<template>
  <div class="q-ml-md q-mt-sm workspace-heading">
    {{ $t("workspace") }}
  </div>
  <q-list>
    <q-item
      v-for="workspace in workspaces"
      :key="workspace.path"
      clickable
      @click="$emit('update:modelValue', workspace.path)"
    >
      <q-item-section>
        <q-item-label class="workspace-label">
          {{ workspace.label }}
        </q-item-label>
        <q-item-label
          caption
          class="workspace-path"
        >
          {{ workspace.path }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn
          dense
          flat
          :ripple="false"
        >
          <MoreVert width="18" height="18" />
          <q-popup-proxy>
            <WorkspaceMenu
              @showInExplorer="showInExplorer"
              @removePath="removeStoragePath"
              @changePath="showFolderPicker"
            />
          </q-popup-proxy>
        </q-btn>
      </q-item-section>
    </q-item>
  </q-list>
</template>
<script setup lang="ts">
import { open } from "@tauri-apps/api/dialog";
import { renameFile } from "@tauri-apps/api/fs";
import { homeDir, sep } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/tauri";
import { Config, db } from "src/backend/database";
import { computed } from "vue";
import { MoreVert } from "@iconoir/vue";
import WorkspaceMenu from "./WorkspaceMenu.vue";

const props = defineProps({
  modelValue: { type: String, default: "" },
});
const emit = defineEmits(["update:modelValue"]);

const workspaces = computed(() => {
  const array = [];
  for (const path of db.config.storagePaths) {
    const splits = path.split(sep);
    array.push({ label: splits[splits.length - 1], path: path });
  }
  return array;
});

async function showInExplorer() {
  if (props.modelValue)
    await invoke("show_in_folder", {
      path: props.modelValue,
    });
}

async function removeStoragePath() {
  let storagePath = db.config.storagePath;
  let storagePaths = db.config.storagePaths;
  storagePaths = storagePaths.filter((path) => path !== props.modelValue);
  if (storagePath === props.modelValue) storagePath = "";
  await db.setConfig({ storagePath, storagePaths } as Config);
  emit("update:modelValue", "");
}

async function showFolderPicker() {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath: await homeDir(),
  });
  if (!result) return;
  await changeStoragePath(result as string);
}

async function changeStoragePath(newPath: string) {
  const oldPath = props.modelValue;
  await renameFile(oldPath, newPath);
  const paths = db.config.storagePaths;
  const index = paths.indexOf(oldPath);
  if (index > -1) paths[index] = newPath;
  await db.setConfig({ storagePath: newPath, storagePaths: paths } as Config);
  emit("update:modelValue", newPath);
}
</script>
<style scoped lang="scss">
.workspace-heading {
  font-size: 1.3rem;
  color: var(--q-reg-text);
}
.workspace-label {
  font-size: 1.2rem;
  color: var(--q-reg-text);
}
.workspace-path {
  font-size: 1rem;
  word-wrap: break-word;
  color: var(--q-text-muted);
}
</style>
