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
import { PropType, onMounted, ref } from "vue";
import { db } from "src/backend/database";
import { invoke } from "@tauri-apps/api/tauri";
import { basename, homeDir } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/dialog";

const props = defineProps({
  modelValue: { type: String, default: "" },
  workspaces: {
    type: Object as PropType<{ label: string; path: string }[]>,
    default: [],
  },
});
const emit = defineEmits(["update:modelValue"]);

const workspaces = ref<{ label: string; path: string }[]>([]);
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
  await db.removeStoragePath(props.modelValue);
  workspaces.value = workspaces.value.filter(
    (w) => w.path !== props.modelValue
  );
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
  await db.moveWorkspace(props.modelValue, newPath);
  for (const workspace of workspaces.value) {
    if (workspace.path === props.modelValue) {
      workspace.path = newPath;
      workspace.label = await basename(newPath);
      emit("update:modelValue", newPath);
    }
  }
}

async function getWorkspaces() {
  const storagePaths = await db.getStoragePaths();
  workspaces.value = [];
  for (const storagePath of storagePaths)
    workspaces.value.push({
      label: await basename(storagePath),
      path: storagePath,
    });
}

onMounted(async () => {
  await getWorkspaces();
});
</script>
