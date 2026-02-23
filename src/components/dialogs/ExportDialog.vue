<template>
  <q-dialog
    v-model="exportDialog.visible"
    @hide="exportDialog.close()"
  >
    <q-card class="dialog export-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">{{ $t("options") }}</span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <div class="export-field">
          <label class="field-label">Format</label>
          <q-select
            outlined
            dense
            options-dense
            :options="exportDialog.formats"
            v-model="exportDialog.format"
            data-cy="format-select"
          />
        </div>
        <div
          v-if="exportDialog.format.value === 'bibliography'"
          class="export-field"
        >
          <label class="field-label">Template</label>
          <q-select
            outlined
            dense
            options-dense
            :options="exportDialog.templates"
            v-model="exportDialog.template"
            data-cy="template-select"
          />
        </div>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('cancel')"
          @click="exportDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('confirm')"
          @click="exportDialog.confirm()"
          data-cy="btn-confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { exportDialog } from "./dialogController";
</script>
<style lang="scss" scoped>
.export-dialog {
  min-width: 380px;
}

.export-field {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
}

.field-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--q-text-muted);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
</style>
