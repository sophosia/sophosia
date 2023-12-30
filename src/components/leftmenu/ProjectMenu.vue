<template>
  <q-menu
    square
    touch-position
    context-menu
  >
    <q-list dense>
      <q-item
        clickable
        v-close-popup
        @click="$emit('copyId')"
      >
        <q-item-section>
          <i18n-t keypath="copy-id">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('copyAsLink')"
      >
        <q-item-section>
          <i18n-t keypath="copy-as-link">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NoteType.MARKDOWN)"
      >
        <q-item-section>
          {{ $t("add-markdown-note") }}
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NoteType.EXCALIDRAW)"
      >
        <q-item-section>
          {{ $t("add-excalidraw") }}
        </q-item-section>
      </q-item>

      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('addFolder')"
      >
        <q-item-section> {{ $t("add-folder") }} </q-item-section>
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
        @click="$emit('closeProject')"
      >
        <q-item-section>
          {{ $t("close-project") }}
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
import { NoteType } from "src/backend/database";
const emit = defineEmits([
  "copyId",
  "copyAsLink",
  "showInExplorer",
  "addNote",
  "addFolder",
  "closeProject",
]);
</script>
