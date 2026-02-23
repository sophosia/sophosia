<template>
  <q-dialog
    v-model="errorDialog.visible"
    persistent
    transition-duration="0"
    no-shake
    @hide="errorDialog.close()"
  >
    <q-card class="dialog error-dialog">
      <q-card-section class="dialog-header">
        <div class="error-title-row">
          <div
            class="error-icon"
            :class="errorDialog.type"
          >
            <q-icon
              :name="errorDialog.type === 'error' ? 'error_outline' : 'warning_amber'"
              size="18px"
            />
          </div>
          <span class="dialog-title">{{ $t(errorDialog.error?.name || "") }}</span>
        </div>
      </q-card-section>
      <q-card-section class="dialog-body">
        <p class="dialog-text" data-cy="error-msg">{{ errorDialog.error?.message || "" }}</p>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
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
<style lang="scss" scoped>
.error-dialog {
  min-width: 380px;
}

.error-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  flex-shrink: 0;

  &.error {
    background: rgba(248, 113, 113, 0.12);
    color: var(--q-negative);
  }

  &.warning {
    background: rgba(251, 191, 36, 0.12);
    color: #fbbf24;
  }
}
</style>
