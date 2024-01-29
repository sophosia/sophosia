<template>
  <q-dialog
    v-model="exportDialog.visible"
    @hide="exportDialog.close()"
  >
    <q-card class="export-dialog dialog">
      <q-card-section>
        <div class="text-h6">{{ $t("options") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div class="row items-center">
          <div class="col-auto">Format:</div>
          <q-select
            class="q-ml-sm col"
            outlined
            dense
            options-dense
            :options="exportDialog.formats"
            v-model="exportDialog.format"
            data-cy="format-select"
          />

          <q-select
            v-if="exportDialog.format.value === 'bibliography'"
            outlined
            dense
            options-dense
            :options="exportDialog.templates"
            v-model="exportDialog.template"
            data-cy="template-select"
          />
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          square
          label="cancel"
          @click="exportDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          label="confirm"
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
