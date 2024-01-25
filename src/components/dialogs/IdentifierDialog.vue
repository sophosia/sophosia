<template>
  <q-dialog
    v-model="identifierDialog.visible"
    @hide="identifierDialog.close()"
  >
    <q-card
      square
      style="min-width: 500px"
    >
      <q-card-section>
        <div class="text-h6">
          <i18n-t keypath="search">
            <template #type>{{ $t("identifier") }}</template>
          </i18n-t>
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          outlined
          square
          dense
          autofocus
          class="full-width"
          placeholder="DOI, ISBN, Wikidata, Ris, ..."
          v-model.trim="identifierDialog.identifier"
          @keydown.enter="identifierDialog.confirm()"
          data-cy="identifier-input"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          :label="$t('cancel')"
          @click="identifierDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          :label="$t('confirm')"
          :disable="!identifierDialog.identifier"
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
