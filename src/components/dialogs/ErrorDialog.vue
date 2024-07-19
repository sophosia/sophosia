<template>
  <q-dialog
    v-model="errorDialog.visible"
    persistent
    transition-duration="0"
    no-shake
    @hide="errorDialog.close()"
  >
    <q-card class="dialog">
      <q-card-section>
        <div class="text-h6 row items-center">
          <q-icon
            :name="
              errorDialog.type === 'error'
                ? 'mdi-alert-circle-outline'
                : 'mdi-alert-outline'
            "
            :color="errorDialog.type === 'error' ? 'negative' : 'warning'"
            style="font-size: 1.5rem"
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
