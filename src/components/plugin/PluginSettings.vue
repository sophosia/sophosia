<template>
  <div v-if="settings">
    <q-card
      v-for="(setting, index) in settings"
      :key="index"
      flat
      bordered
      square
      class="card q-ma-md row items-center justify-between"
    >
      <q-card-section class="q-py-none">
        <div class="text-subtitle1 text-bold">
          {{ setting.label }}
        </div>
        <div class="q-mb-xs">{{ setting.description }}</div>
      </q-card-section>
      <q-card-actions>
        <q-toggle
          v-if="setting.type == 'toggle'"
          v-model="setting.value"
          @update:model-value="pluginManager.saveSettings(pluginId, settings)"
          color="primary"
          size="2.2rem"
        >
          <q-tooltip>{{
            setting.value ? $t("enable") : $t("disable")
          }}</q-tooltip>
        </q-toggle>
        <q-input
          v-if="setting.type == 'input'"
          v-model="setting.value"
          @update:model-value="pluginManager.saveSettings(pluginId, settings)"
          :type="setting.inputType"
          dense
          square
          outlined
        />
        <q-select
          v-if="setting.type == 'select'"
          v-model="setting.value"
          @update:model-value="pluginManager.saveSettings(pluginId, settings)"
          :options="setting.options"
          dense
          options-dense
          outlined
          square
        />
        <q-slider
          v-if="setting.type == 'slider'"
          v-model="setting.value"
          @update:model-value="pluginManager.saveSettings(pluginId, settings)"
          :min="setting.min"
          :max="setting.max"
          :step="setting.step"
          :snap="setting.snap"
          style="width: 200px; margin-right: 10px"
          markers
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<script setup lang="ts">
import { Setting } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { ref, watchEffect } from "vue";
const props = defineProps({
  pluginId: { type: String, required: true },
});

const settings = ref<Setting[]>([]);
watchEffect(() => {
  settings.value = pluginManager.getSettings(props.pluginId);
});
</script>

<style scoped>
.card {
  background: var(--color-settings-card-bkgd);
}
</style>
