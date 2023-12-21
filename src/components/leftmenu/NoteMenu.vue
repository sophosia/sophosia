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
        @click="$emit('rename')"
      >
        <q-item-section> {{ $t("rename") }} </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('delete')"
      >
        <q-item-section> {{ $t("delete") }} </q-item-section>
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
const emit = defineEmits(["showInExplorer", "rename", "delete"]);
</script>
