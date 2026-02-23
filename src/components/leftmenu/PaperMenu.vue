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
        @click="$emit('addNote', NodeType.MARKDOWN)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NodeType.EXCALIDRAW)"
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
        @click="$emit('copyId')"
      >
        <q-item-section>
          <i18n-t keypath="copy-id">
            <template #type>{{ $t("note") }}</template>
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
      <q-item
        clickable
        v-close-popup
        @click="$emit('showInNewWindow')"
      >
        <q-item-section>
          {{ $t("open-page-in-new-window") }}
        </q-item-section>
      </q-item>

      <q-separator />

      <q-item
        clickable
        v-close-popup
        @click="$emit('delete')"
      >
        <q-item-section>
          <i18n-t keypath="delete">
            <template #type>PDF</template>
          </i18n-t>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
import { NodeType } from "src/backend/database";
const emit = defineEmits([
  "addNote",
  "copyId",
  "showInExplorer",
  "showInNewWindow",
  "delete",
]);
</script>
