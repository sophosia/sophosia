<template>
  <q-dialog
    v-model="progressDialog.visible"
    persistent
  >
    <q-card style="width: 50vw">
      <q-card-section>
        <div class="text-h6">{{ $t("moving-files") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-linear-progress
          size="1rem"
          :value="progressDialog.progress"
          animation-speed="0"
        >
          <div class="absolute-full flex flex-center">
            <q-badge color="transparent">
              {{ Math.round(progressDialog.progress * 100) }} %
            </q-badge>
          </div>
        </q-linear-progress>
        <div
          v-for="(error, index) in progressDialog.errors"
          :key="index"
          class="text-negative"
          :data-cy="`error-prompt-${index}`"
        >
          {{ error }}
        </div>
        <div v-show="progressDialog.progress >= 0.999">
          {{ $t("files-were-successfully-transfer-to-new-path") }}
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          :disable="progressDialog.progress < 0.999"
          :ripple="false"
          label="OK"
          v-close-popup
          data-cy="btn-ok"
        >
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { progressDialog } from "./dialogController";
</script>
