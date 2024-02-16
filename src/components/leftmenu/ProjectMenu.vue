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
      <q-item
        clickable
        v-close-popup
        @click="$emit('exportCitation')"
      >
        <q-item-section>
          {{ $t("copy-reference") }}
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('addNote', NoteType.MARKDOWN)"
      >
        <q-item-section>
          <i18n-t keypath="add">
            <template #type>Markdown</template>
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
            <template #type>Excalidraw</template>
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
      <q-item
        clickable
        v-close-popup
        @click="$emit('closeProject')"
      >
        <q-item-section>
          <i18n-t keypath="close">
            <template #type>{{ $t("project") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
import { NoteType } from "src/backend/database";

const props = defineProps({
  projectId: { type: String, required: true },
});

const emit = defineEmits([
  "copyId",
  "copyAsLink",
  "showInExplorer",
  "addNote",
  "addFolder",
  "showInNewWindow",
  "closeProject",
  "exportCitation",
]);
</script>
