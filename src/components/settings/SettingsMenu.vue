<template>
  <div class="settings-page">
    <div class="settings-tabs">
      <div class="settings-tabs-scroll">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="settings-tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" width="12" height="12" />
          <span>{{ $t(tab.label) }}</span>
        </button>
      </div>
    </div>
    <div class="settings-content">
      <GeneralTab v-if="activeTab === 'general'" />
      <PluginTab v-else-if="activeTab === 'plugin'" />
      <AboutTab v-else-if="activeTab === 'about'" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, type Component } from "vue";
import { Settings, Puzzle, InfoCircle } from "@iconoir/vue";
import AboutTab from "src/components/settings/AboutTab.vue";
import GeneralTab from "src/components/settings/GeneralTab.vue";
import PluginTab from "src/components/settings/plugin/PluginTab.vue";

const tabs: { id: string; label: string; icon: Component }[] = [
  { id: "general", label: "general", icon: Settings },
  { id: "plugin", label: "plugins", icon: Puzzle },
  { id: "about", label: "about", icon: InfoCircle },
];

const activeTab = ref("general");
</script>
<style lang="scss" scoped>
.settings-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.settings-tabs {
  flex-shrink: 0;
  height: var(--sub-tab-height);
  border-bottom: 1px solid var(--q-border);
  background: var(--q-surface);
}

.settings-tabs-scroll {
  display: flex;
  align-items: stretch;
  height: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.settings-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--q-text-muted);
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
  user-select: none;

  &:hover {
    color: var(--q-reg-text);
    background: var(--q-hover);
  }

  &.active {
    color: var(--q-primary);
    background: var(--q-active);
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}
</style>
