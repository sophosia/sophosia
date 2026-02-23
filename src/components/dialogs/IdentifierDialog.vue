<template>
  <q-dialog
    v-model="identifierDialog.visible"
    @hide="identifierDialog.close()"
  >
    <q-card class="dialog identifier-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">
          <i18n-t keypath="search">
            <template #type>{{ $t("identifier") }}</template>
          </i18n-t>
        </span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <q-input
          outlined
          dense
          autofocus
          class="full-width"
          placeholder="DOI, ISBN, Wikidata, Ris, ..."
          v-model.trim="identifierDialog.identifier"
          @keydown.enter="identifierDialog.confirm()"
          data-cy="identifier-input"
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
          @click="identifierDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('confirm')"
          :disable="!identifierDialog.identifier"
          v-close-popup
          @click="identifierDialog.confirm()"
          data-cy="btn-confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { identifierDialog } from "src/components/dialogs/dialogController";
</script>
