<template>
  <q-dialog
    v-model="errorDialog.visible"
    persistent
    transition-duration="0"
    no-shake
    @hide="errorDialog.close()"
  >
    <q-card
      square
      class="dialog"
    >
      <q-card-section>
        <div class="text-h6">
          <q-icon
            :name="errorDialog.error?.name"
            :color="errorDialog.error?.name == 'error' ? 'negative' : 'warning'"
          />
          {{ $t(errorDialog.error?.name || "") }}
        </div>
      </q-card-section>
      <q-card-section
        class="q-pt-none"
        data-cy="error-msg"
      >
        {{ errorDialog.error?.message || "" }}
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          dense
          :ripple="false"
          label="OK"
          @click="errorDialog.close()"
          data-cy="btn-ok"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { errorDialog } from "src/components/dialogs/dialogController";
</script>
