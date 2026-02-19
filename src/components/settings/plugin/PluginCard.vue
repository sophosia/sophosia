<template>
  <q-card
    flat
    bordered
    class="card q-mb-sm row items-center justify-between"
  >
    <q-card-section class="q-py-none">
      <div class="text-subtitle1 text-bold">
        {{ manifest.name }}
        <StarIcon
          width="14"
          height="14"
          class="q-ml-md"
        />
        {{ star }}
      </div>
      <div>{{ manifest.author }}</div>
      <div>{{ $t("version", [manifest.version]) }}</div>
      <div class="q-mb-xs">{{ manifest.description }}</div>
    </q-card-section>
    <q-card-actions v-if="status !== undefined">
      <q-btn
        flat
        dense
        square
        no-caps
        size="0.7rem"
        padding="xs"
        :ripple="false"
        @click="openSettingPage(manifest)"
      >
        <SettingsIcon width="16" height="16" />
        <q-tooltip>{{ $t("settings") }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        square
        no-caps
        size="0.7rem"
        padding="xs"
        :ripple="false"
        @click="$emit('install')"
      >
        <ArrowUp width="16" height="16" />
        <q-tooltip>{{ $t("update") }}</q-tooltip>
      </q-btn>
      <q-btn
        flat
        dense
        square
        no-caps
        size="0.7rem"
        padding="xs"
        :ripple="false"
        @click="$emit('uninstall')"
      >
        <Trash width="16" height="16" />
        <q-tooltip>{{ $t("delete") }}</q-tooltip>
      </q-btn>
      <q-toggle
        v-model="enabled"
        color="primary"
        size="2.2rem"
      >
        <q-tooltip>{{ enabled ? $t("disable") : $t("enable") }}</q-tooltip>
      </q-toggle>
    </q-card-actions>
    <q-card-actions v-else>
      <q-btn
        dense
        unelevated
        no-caps
        size="0.8rem"
        color="primary"
        :ripple="false"
        :disable="disableInstall"
        @click="
          $emit('install');
          disableInstall = true;
        "
      >
        {{ !disableInstall ? $t("install") : $t("installing") }}
      </q-btn>
    </q-card-actions>
  </q-card>
</template>
<script setup lang="ts">
import { Star as StarIcon, Settings as SettingsIcon, ArrowUp, Trash } from "@iconoir/vue";
import { PageType, PluginManifest, PluginStatus } from "src/backend/database";
import { useLayoutStore } from "src/stores/layoutStore";
import { PropType, computed, onMounted, ref, watch } from "vue";
const layoutStore = useLayoutStore();

const props = defineProps({
  manifest: { type: Object as PropType<PluginManifest>, required: true },
  status: { type: Object as PropType<PluginStatus>, required: false },
});
const emit = defineEmits(["toggle", "install", "uninstall"]);
const star = ref<number | null>(null);
const disableInstall = ref(!!props.status);
const enabled = computed({
  get() {
    return !!props.status?.enabled;
  },
  set(value: boolean) {
    emit("toggle", value);
  },
});

watch(
  () => props.status,
  (status: PluginStatus | undefined) => {
    disableInstall.value = !!status;
  }
);

function openSettingPage(manifest: PluginManifest) {
  const id = manifest.id;
  const label = `${manifest.name} Settings`;
  const type = PageType.PluginSettingsPage;
  layoutStore.openPage({ id, type, label });
}

onMounted(async () => {
  try {
    let response = await fetch(
      `https://api.github.com/repos/${props.manifest.repo}`
    );
    let data = await response.json();
    star.value = data.stargazers_count;
  } catch (error) {
    star.value = null;
  }
});
</script>
<style scoped>
.card {
  background: var(--color-settings-card-bkgd);
}
</style>
