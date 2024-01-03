<template>
  <ProgressDialog
    v-model="showProgressDialog"
    :progress="progress"
    :errors="errors"
  />
  <div
    class="q-ml-md q-mt-sm"
    style="font-size: 1.3rem"
  >
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
        <q-item-label style="font-size: 1.2rem">
          {{ workspace.label }}
        </q-item-label>
        <q-item-label
          caption
          style="font-size: 1rem; word-wrap: break-word"
        >
          {{ workspace.path }}
        </q-item-label>
      </q-item-section>
      <q-item-section side>
        <q-btn
          dense
          flat
          :ripple="false"
          icon="mdi-dots-vertical"
        >
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
import WorkspaceMenu from "./WorkspaceMenu.vue";
import ProgressDialog from "./ProgressDialog.vue";
import { PropType, computed, ref } from "vue";
import { Config, db } from "src/backend/database";
import { invoke } from "@tauri-apps/api/tauri";
import { basename, homeDir, sep } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";
import { renameFile } from "@tauri-apps/api/fs";

const props = defineProps({
  modelValue: { type: String, default: "" },
  workspaces: {
    type: Object as PropType<{ label: string; path: string }[]>,
    default: [],
  },
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
// progressDialog
const showProgressDialog = ref(false);
const errors = ref<Error[]>([]);
const progress = ref(0.0);

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
  // let result = window.fileBrowser.showFolderPicker();
  let result = await open({
    directory: true,
    multiple: false,
    defaultPath: await homeDir(),
  });
  if (result !== undefined && result != null && !!result) {
    let storagePath = result as string; // do not update texts in label yet
    await changeStoragePath(storagePath);
  }
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
