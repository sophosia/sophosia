<template>
  <q-dialog v-model="importDialog.visible">
    <q-card
      square
      class="import-dialog dialog"
    >
      <q-card-section>
        <div class="text-h6">{{ $t("import-collection") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-checkbox
          dense
          v-model="importDialog.isCreateFolder"
          :label="$t('create-a-new-folder-for-this-collection')"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          :label="$t('cancel')"
          @click="importDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          :label="$t('confirm')"
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
