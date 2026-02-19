<template>
  <q-splitter
    v-model="leftMenuSize"
    :limits="[10, 30]"
    class="fit"
    separator-class="q-splitter-separator"
  >
    <template v-slot:before>
      <div class="settings-panel">
        <q-tabs
          v-model="tab"
          vertical
          no-caps
          stretch
          inline-label
          align="left"
          indicator-color="transparent"
        >
          <q-tab
            name="general"
            :ripple="false"
          >
            <Settings width="20" height="20" />
            <span class="q-ml-xs settings-tab-label">
              {{ $t("general") }}
            </span>
          </q-tab>
          <q-tab
            name="plugin"
            :ripple="false"
          >
            <Puzzle width="20" height="20" />
            <span class="q-ml-xs settings-tab-label">
              {{ $t("plugins") }}
            </span>
          </q-tab>
          <q-tab
            name="about"
            :ripple="false"
          >
            <InfoCircle width="20" height="20" />
            <span class="q-ml-xs settings-tab-label">
              {{ $t("about") }}
            </span>
          </q-tab>
        </q-tabs>
      </div>
    </template>

    <template v-slot:after>
      <div class="fit row">
        <q-tab-panels
          v-model="tab"
          vertical
          class="settings fit"
        >
          <q-tab-panel name="general">
            <GeneralTab />
          </q-tab-panel>
          <q-tab-panel name="plugin">
            <PluginTab />
          </q-tab-panel>
          <q-tab-panel name="about">
            <AboutTab />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </template>
  </q-splitter>
</template>
<script setup lang="ts">
import AboutTab from "src/components/settings/AboutTab.vue";
import GeneralTab from "src/components/settings/GeneralTab.vue";
import PluginTab from "src/components/settings/plugin/PluginTab.vue";
import { ref } from "vue";
import { Settings, Puzzle, InfoCircle } from "@iconoir/vue";

const leftMenuSize = ref(20);
const tab = ref("general");
</script>
<style scoped lang="scss">
.settings-tab-label {
  font-size: 0.875rem;
}
</style>
