<template>
  <router-view />
  <!-- message dialog -->
  <q-dialog
    v-model="stateStore.showMessageDialog"
    position="top"
    seamless
    square
  >
    <q-card class="dimmed transparent">
      <q-card-section>
        <div>{{ stateStore.message }}</div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useStateStore } from "./stores/appState";
const stateStore = useStateStore();
</script>
