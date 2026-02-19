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
          class="full-width cursor-pointer"
          v-close-popup
          @click="$emit('copyId')"
        >
          <div>
            <q-icon name="content_copy"></q-icon>
            {{ $t("copy-id", { type: $t("annotation") }) }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="full-width cursor-pointer"
          v-close-popup
          @click="$emit('copyAsLink')"
        >
          <div>
            <q-icon name="content_copy"></q-icon>
            {{ $t("copy-as-link", { type: $t("annotation") }) }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="full-width cursor-pointer"
          v-close-popup
          @click="$emit('deleteAnnot')"
        >
          <div>
            <q-icon name="delete_outline"></q-icon>
            {{ $t("delete", { type: $t("annotation") }) }}
          </div>
        </div>
      </q-item>
      <q-item>
        <div
          class="full-width cursor-pointer"
          v-close-popup
          @click="$emit('scrollIntoView')"
        >
          <div>
            <q-icon name="my_location"> </q-icon>
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
  "copyAsLink",
]);
</script>

<style scoped lang="scss"></style>
