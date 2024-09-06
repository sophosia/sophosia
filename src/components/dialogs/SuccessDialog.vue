<template>
  <q-dialog
    v-model="successDialog.visible"
    persistent
    transition-duration="0"
    no-shake
    @hide="successDialog.close()"
  >
    <q-card class="dialog">

      <q-card-section
        class="q-pt-none flex justify-center"
      >
        {{ successDialog.message }}
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          dense
          :ripple="false"
          label="OK"
          @click="successDialog.close()"
          data-cy="btn-ok"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { successDialog } from "src/components/dialogs/dialogController";
</script>
