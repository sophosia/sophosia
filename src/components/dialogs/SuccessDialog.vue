<template>
  <q-dialog
    v-model="successDialog.visible"
    persistent
    transition-duration="0"
    no-shake
    @hide="successDialog.close()"
  >
    <q-card class="dialog success-dialog">
      <q-card-section class="dialog-body">
        <p class="dialog-text" style="text-align: center">
          {{ successDialog.message }}
        </p>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
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
<style lang="scss" scoped>
.success-dialog {
  min-width: 320px;
}
</style>
