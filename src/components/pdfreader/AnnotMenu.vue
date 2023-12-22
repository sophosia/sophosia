<template>
  <q-menu data-cy="annot-menu">
    <q-list dense>
      <q-item>
        <ColorPicker
          @selected="(color: string) => $emit('changeColor', color)"
        />
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('copyID')"
        >
          <div style="font-size: 1rem">
            <q-icon name="mdi-content-copy"></q-icon>
            {{ $t("copy-annot-id") }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('copyAsLink')"
        >
          <div style="font-size: 1rem">
            <q-icon name="mdi-content-copy"></q-icon>
            {{ $t("copy-annot-as-link") }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('deleteAnnot')"
        >
          <div style="font-size: 1rem">
            <q-icon name="mdi-delete-outline"></q-icon>
            {{ $t("delete-annot") }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="button full-width"
          v-close-popup
          @click="$emit('scrollIntoView')"
        >
          <div style="font-size: 1rem">
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
  "copyID",
  "scrollIntoView",
  "copyAsLink",
]);
</script>

<style scoped lang="scss">
.button {
  cursor: pointer;
  padding-left: 10px !important;
  padding-right: 10px !important;

  &:hover {
    background: grey;
  }
}
</style>
