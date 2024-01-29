<template>
  <q-menu
    class="menu"
    data-cy="annot-menu"
  >
    <q-list dense>
      <q-item class="color-picker">
        <ColorPicker
          @selected="(color: string) => $emit('changeColor', color)"
        />
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('copyId')"
        >
          <div>
            <q-icon name="mdi-content-copy"></q-icon>
            <i18n-t keypath="copy-id">
              <template #type>{{ $t("annotation") }}</template>
            </i18n-t>
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('copyAsLink')"
        >
          <div>
            <q-icon name="mdi-content-copy"></q-icon>
            <i18n-t keypath="copy-as-link">
              <template #type>{{ $t("annotation") }}</template>
            </i18n-t>
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('deleteAnnot')"
        >
          <div>
            <q-icon name="mdi-delete-outline"></q-icon>
            <i18n-t keypath="delete">
              <template #type>{{ $t("annotation") }}</template>
            </i18n-t>
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('scrollIntoView')"
        >
          <div>
            <q-icon name="mdi-crosshairs"> </q-icon>
            {{ $t("scroll-into-view") }}
          </div>
        </div>
      </q-item>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import ColorPicker from "./ColorPicker.vue";

const emit = defineEmits([
  "changeColor",
  "deleteAnnot",
  "scrollIntoView",
  "copyId",
  "copyAsLink"
]);
</script>

<style scoped lang="scss"></style>
