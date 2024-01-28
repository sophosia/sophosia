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
            <q-icon
              name="mdi-tune-vertical"
              size="sm"
            />
            <div style="font-size: 1rem; padding-left: 0.5rem">
              {{ $t("general") }}
            </div>
          </q-tab>
          <q-tab
            name="plugin"
            :ripple="false"
          >
            <q-icon
              name="mdi-toy-brick-outline"
              size="sm"
            ></q-icon>
            <div style="font-size: 1rem; padding-left: 0.5rem">
              {{ $t("plugins") }}
            </div>
          </q-tab>
          <q-tab
            name="about"
            :ripple="false"
          >
            <q-icon
              name="mdi-information-outline"
              size="sm"
            ></q-icon>
            <div style="font-size: 1rem; padding-left: 0.5rem">
              {{ $t("about") }}
            </div>
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
import { ref } from "vue";
import GeneralTab from "src/components/settings/GeneralTab.vue";
import AboutTab from "src/components/settings/AboutTab.vue";
import PluginTab from "src/components/settings/plugin/PluginTab.vue";

const leftMenuSize = ref(20);
const tab = ref("general");
</script>
