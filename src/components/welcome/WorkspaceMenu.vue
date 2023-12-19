<template>
  <q-list dense>
    <q-item
      clickable
      v-close-popup
      @click="$emit('showInExplorer')"
    >
      <q-item-section> {{ $t("show-in-explorer") }} </q-item-section>
    </q-item>
    <q-item
      clickable
      v-close-popup
      @click="$emit('removePath')"
    >
      <q-item-section>{{ $t("remove-from-list") }}</q-item-section>
    </q-item>
    <q-item
      clickable
      v-close-popup
      @click="$emit('changePath')"
    >
      <q-item-section>{{ $t("change-path") }}</q-item-section>
    </q-item>
  </q-list>
</template>
<script setup lang="ts">
const emit = defineEmits(["showInExplorer", "removePath", "changePath"]);
</script>
