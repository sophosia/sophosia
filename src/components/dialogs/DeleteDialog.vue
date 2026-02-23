<template>
  <q-dialog
    v-model="deleteDialog.visible"
    persistent
    no-shake
    @hide="deleteDialog.close()"
  >
    <q-card class="dialog delete-dialog">
      <q-card-section class="dialog-header">
        <span class="dialog-title">
          {{ deleteDialog.isDeleteFromDB ? $t("permenantly-delete") : $t("delete") }}
        </span>
      </q-card-section>
      <q-card-section class="dialog-body">
        <p class="dialog-text">
          {{ $t("are-you-sure-you-want-to-delete-the-following-project") }}
        </p>
        <ul class="delete-list">
          <li
            v-for="project in deleteDialog.deleteProjects"
            :key="project._id"
          >
            {{ getTitle(project, settingStore.showTranslatedTitle) }}
          </li>
        </ul>
        <div
          v-if="deleteDialog.isDeleteFromDB"
          class="delete-warning"
        >
          <p>{{ $t("this-operation-is-not-reversible") }}</p>
          <p>{{ $t("notes-in-this-project-will-be-deleted") }}</p>
        </div>
      </q-card-section>
      <q-card-actions class="dialog-actions">
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn"
          :label="$t('cancel')"
          v-close-popup
          @click="deleteDialog.close()"
          data-cy="btn-cancel"
        />
        <q-btn
          flat
          square
          :ripple="false"
          class="dialog-btn dialog-btn--danger"
          :label="$t('confirm')"
          v-close-popup
          @click="deleteDialog.confirm()"
          data-cy="btn-confirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { getTitle } from "src/backend/utils";
import { useSettingStore } from "src/stores/settingStore";
import { deleteDialog } from "./dialogController";
const settingStore = useSettingStore();
</script>
<style lang="scss" scoped>
.delete-dialog {
  min-width: 420px;
}

.delete-list {
  margin: 8px 0;
  padding-left: 20px;
  color: var(--q-reg-text);
  font-size: 0.875rem;

  li {
    padding: 2px 0;
  }
}

.delete-warning {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);

  p {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--q-negative);
    line-height: 1.5;
  }
}
</style>
