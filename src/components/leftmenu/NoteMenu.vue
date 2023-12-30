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
            <template #type>{{ $t("note") }}</template>
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
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        v-close-popup
        @click="$emit('rename')"
      >
        <q-item-section>
          <i18n-t keypath="rename">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('delete')"
      >
        <q-item-section>
          <i18n-t keypath="rename">
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
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
const emit = defineEmits([
  "copyId",
  "copyAsLink",
  "showInExplorer",
  "rename",
  "delete",
]);
</script>
