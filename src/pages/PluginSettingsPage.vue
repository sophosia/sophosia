<template>
  <q-card
    v-for="(setting, index) in plugin?.settings"
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
        @update:model-value="plugin.saveSettings()"
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
        @update:model-value="plugin.saveSettings()"
        :type="setting.inputType"
        dense
        square
        outlined
      />
      <q-select
        v-if="setting.type == 'select'"
        v-model="setting.value"
        @update:model-value="plugin.saveSettings()"
        :options="setting.options"
        dense
        options-dense
        outlined
        square
      />
      <q-slider
        v-if="setting.type == 'slider'"
        v-model="setting.value"
        @update:model-value="plugin.saveSettings()"
        :min="setting.min"
        :max="setting.max"
        :step="setting.step"
        :snap="setting.snap"
        style="width: 200px; margin-right: 10px"
        markers
      />
    </q-card-actions>
  </q-card>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { Plugin } from "src/backend/database";
import pluginManager from "src/backend/plugin";
import { PageData } from "src/backend/database";
import { PropType } from "vue";
const props = defineProps({
  id: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<PageData>, required: true },
});

const pluginId = ref(props.data._id);
const plugin = pluginManager.plugins.value.get(pluginId.value) as Plugin;

console.log("plugin", plugin);
</script>
<style scoped>
.card {
  background: var(--color-settings-card-bkgd);
}
</style>
