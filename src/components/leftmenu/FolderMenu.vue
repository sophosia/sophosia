<template>
  <q-menu
    square
    touch-position
    context-menu
    class="menu"
  >
    <q-list dense>
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NoteType.MARKDOWN)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>{{ "Markdown" }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NoteType.EXCALIDRAW)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>{{ "Excalidraw" }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('addFolder')"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>{{ $t("folder") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('renameFolder')"
      >
        <q-item-section>
          <i18n-t keypath="rename">
            <template #type>{{ $t("folder") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('deleteFolder')"
      >
        <q-item-section>
          <i18n-t keypath="delete">
            <template #type>{{ $t("folder") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>

      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('showInExplorer')"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
import { NoteType } from "src/backend/database";
const emit = defineEmits([
  "showInExplorer",
  "addNote",
  "addFolder",
  "renameFolder",
  "deleteFolder",
]);
</script>
