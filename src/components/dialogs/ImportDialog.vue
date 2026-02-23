<template>
  <q-dialog
    v-model="importDialog.visible"
    @hide="importDialog.close()"
  >
    <q-card class="dialog import-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">{{ $t("import-collection") }}</span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <q-checkbox
          dense
          v-model="importDialog.isCreateFolder"
          :label="$t('create-a-new-folder-for-this-collection')"
          class="import-checkbox"
        />
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('cancel')"
          v-close-popup
          @click="importDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('confirm')"
          v-close-popup
          @click="importDialog.confirm()"
          data-cy="btn-confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { importDialog } from "./dialogController";
</script>
<style lang="scss" scoped>
.import-checkbox {
  font-size: 0.875rem;
}
</style>
