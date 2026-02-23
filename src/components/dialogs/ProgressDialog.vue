<template>
  <q-dialog
    v-model="progressDialog.visible"
    persistent
  >
    <q-card class="dialog progress-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">{{ $t("progress") }}</span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <div class="progress-bar-wrapper">
          <q-linear-progress
            size="6px"
            rounded
            :value="progressDialog.progress"
            animation-speed="0"
            color="primary"
            track-color="transparent"
            class="progress-bar"
          />
          <span class="progress-percent">
            {{ Math.round(progressDialog.progress * 100) }}%
          </span>
        </div>
        <div
          v-for="(error, index) in progressDialog.errors"
          :key="index"
          class="progress-error"
          :data-cy="`error-prompt-${index}`"
        >
          {{ error }}
        </div>
        <div
          v-show="progressDialog.progress >= 0.999"
          class="progress-done"
        >
          {{ $t("done") }}
        </div>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :disable="progressDialog.progress < 0.999"
          label="OK"
          v-close-popup
          data-cy="btn-ok"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { progressDialog } from "./dialogController";
</script>
<style lang="scss" scoped>
.progress-dialog {
  min-width: 400px;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  background: var(--q-elevated);
  border-radius: 3px;
}

.progress-percent {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--q-text-muted);
  min-width: 36px;
  text-align: right;
}

.progress-error {
  margin-top: 8px;
  font-size: 0.8125rem;
  color: var(--q-negative);
}

.progress-done {
  margin-top: 8px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--q-primary);
}
</style>
