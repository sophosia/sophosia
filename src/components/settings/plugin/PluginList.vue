<template>
  <ActionBar
    v-model:search="search"
    :showAddBtn="isLocal"
    :showCloseBtn="!isLocal"
  />
  <PluginCard
    v-if="filteredManifests.length > 0"
    v-for="manifest in filteredManifests"
    class="q-mx-md"
    :key="manifest.id"
    :manifest="manifest"
    :status="pluginManager.getStatus(manifest.id)"
    @toggle="(enable: boolean) => pluginManager.toggle(manifest.id, enable)"
    @install="install(manifest)"
    @uninstall="uninstall(manifest)"
  />
  <h6 v-else>{{ $t("no-plugins") }}</h6>
</template>
<script setup lang="ts">
import { PluginManifest } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { onMounted, ref, watch } from "vue";
import ActionBar from "./ActionBar.vue";
import PluginCard from "./PluginCard.vue";

const props = defineProps({
  isLocal: { type: Boolean, required: true },
});

const filteredManifests = ref<PluginManifest[]>([]);
const search = ref("");

watch(search, (text: string) => {
  filteredManifests.value = pluginManager.filter(text, props.isLocal);
});

async function install(manifest: PluginManifest) {
  await pluginManager.download(manifest);
  filteredManifests.value = pluginManager.filter(search.value, props.isLocal);
}

async function uninstall(manifest: PluginManifest) {
  await pluginManager.toggle(manifest.id, false);
  await pluginManager.delete(manifest);
  filteredManifests.value = pluginManager.filter(search.value, props.isLocal);
}

onMounted(async () => {
  if (props.isLocal) {
    filteredManifests.value = pluginManager.pluginManifests.value;
  } else {
    await pluginManager.getCommunityManifests();
    filteredManifests.value = pluginManager.communityManifests.value;
  }
  pluginManager.loadAll();
});
</script>
