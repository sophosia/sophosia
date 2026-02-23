<template>
  <q-dialog
    v-model="nameDialog.visible"
    @hide="nameDialog.close()"
  >
    <q-card class="dialog name-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">{{ nameDialog.title }}</span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <q-input
          outlined
          dense
          autofocus
          class="full-width"
          :placeholder="nameDialog.placeholder"
          v-model.trim="nameDialog.name"
          @update:model-value="checkName"
          @keydown.enter="onEnter"
          :color="nameDialog.isDuplicate ? 'negative' : ''"
          :bottom-slots="nameDialog.isDuplicate"
        >
          <template v-slot:hint v-if="nameDialog.isDuplicate">
            <span class="duplicate-hint">{{ $t("duplicate") }}</span>
          </template>
        </q-input>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          class="dialog-btn"
          :label="$t('cancel')"
          @click="nameDialog.close()"
        />
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('confirm')"
          :disable="!nameDialog.name || nameDialog.isDuplicate"
          @click="nameDialog.confirm()"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { nameDialog } from "src/components/dialogs/dialogController";

function checkName() {
  nameDialog.isDuplicate = nameDialog.validateName(nameDialog.name);
}

function onEnter() {
  if (nameDialog.name && !nameDialog.isDuplicate) {
    nameDialog.confirm();
  }
}
</script>
<style lang="scss" scoped>
.name-dialog {
  min-width: 400px;
}

.duplicate-hint {
  color: var(--q-negative);
  font-size: 0.75rem;
}
</style>
