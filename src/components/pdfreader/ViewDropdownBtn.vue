<template>
  <q-btn
    dense
    flat
    square
    :ripple="false"
    icon="visibility"
    size="0.7rem"
    padding="xs"
    data-cy="btn-dropdown"
  >
    <q-tooltip>{{ $t("view") }}</q-tooltip>
    <q-menu
      class="menu"
      data-cy="menu-dropdown"
    >
      <q-list dense>
        <q-item class="column items-center">
          <q-btn
            dense
            flat
            :ripple="false"
            :label="$t('page-width')"
            no-caps
            icon="swap_horiz"
            @click="$emit('changeScale', { scaleValue: 'page-width' })"
            data-cy="btn-page-width"
          />
          <q-btn
            dense
            flat
            :ripple="false"
            :label="$t('page-height')"
            no-caps
            icon="swap_vert"
            @click="$emit('changeScale', { scaleValue: 'page-height' })"
            data-cy="btn-page-height"
          />
        </q-item>
        <q-separator />
        <q-item class="row justify-center items-center">
          <q-btn
            dense
            flat
            :ripple="false"
            icon="zoom_out"
            @click="$emit('changeScale', { delta: -0.1 })"
            data-cy="btn-zoom-out"
          >
            <q-tooltip>{{ $t("zoom-out") }}</q-tooltip>
          </q-btn>
          <div data-cy="scale">
            {{ Math.trunc(currentScale * 100) + "%" }}
          </div>
          <q-btn
            dense
            flat
            :ripple="false"
            icon="zoom_in"
            @click="$emit('changeScale', { delta: 0.1 })"
            data-cy="btn-zoom-in"
          >
            <q-tooltip>{{ $t("zoom-in") }}</q-tooltip>
          </q-btn>
        </q-item>
        <q-separator />
        <q-item class="justify-center">
          <q-btn-toggle
            class="column"
            flat
            dense
            square
            no-caps
            :ripple="false"
            :options="[
              {
                label: $t('no-spreads'),
                value: 0,
                icon: 'filter_none',
              },
              {
                label: $t('odd-spreads'),
                value: 1,
                icon: 'looks_one',
              },
              {
                label: $t('even-spreads'),
                value: 2,
                icon: 'looks_two',
              },
            ]"
            :model-value="spreadMode"
            @update:model-value="(mode: number) => $emit('changeSpreadMode',mode)"
            data-cy="btn-toggle-spread"
          />
        </q-item>
        <q-separator />
        <q-item class="justify-center">
          <q-btn
            dense
            square
            flat
            :ripple="false"
            :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
            :label="
              isFullscreen ? $t('exit-full-screen') : $t('enter-full-screen')
            "
            no-caps
            padding="none"
            @click="$emit('toggleFullscreen')"
            data-cy="btn-toggle-fullscreen"
          />
        </q-item>

        <q-separator />
        <q-item class="justify-between items-center">
          <q-toggle
            dense
            style="font-weight: 500"
            :model-value="darkMode"
            @update:model-value="$emit('toggleDarkMode')"
            unchecked-icon="brightness_4"
            checked-icon="wb_sunny"
            :label="darkMode ? $t('enter-light-mode') : $t('enter-dark-mode')"
          />
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>
<script setup lang="ts">
const props = defineProps({
  currentScale: { type: Number, required: true, default: 1 },
  spreadMode: { type: Number, required: true, default: 0 },
  isFullscreen: { type: Boolean, required: true, default: false },
  darkMode: { type: Boolean, required: true, default: false },
});
const emit = defineEmits([
  "changeScale",
  "changeSpreadMode",
  "toggleFullscreen",
  "toggleDarkMode",
]);
</script>
