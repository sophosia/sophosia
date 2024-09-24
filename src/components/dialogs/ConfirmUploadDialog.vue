<template>
  <q-dialog
    v-if="!confirmUploadDialog.doNotShowAgain"
    v-model="confirmUploadDialog.visible"
    persistent
    no-shake
    @hide="confirmUploadDialog.close()"
  >
    <q-card class="dialog">
      <q-card-section>
        <div class="text-h6">{{ $t("upload-confirmation") }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <strong>
          {{ $t("upload-file-agreement") }}
        </strong>
        <q-checkbox
          dense
          v-model="doNotShowAgain"
        >
          {{ $t("do-not-show-msg-again") }}
        </q-checkbox>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          @click="confirmUploadDialog.close()"
          data-cy="btn-cancel"
        >
          {{ $t("cancel") }}
        </q-btn>
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          @click="confirmUploadDialog.confirm()"
          color="negative"
          data-cy="btn-confirm"
        >
          {{ $t("confirm") }}
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script setup lang="ts">
import { useSettingStore } from "src/stores/settingStore";
import { computed } from "vue";
import { confirmUploadDialog } from "./dialogController";
const settingStore = useSettingStore();
const doNotShowAgain = computed({
  get() {
    return !settingStore.showConfirmUploadDialog;
  },
  set(doNotShow: boolean) {
    settingStore.showConfirmUploadDialog = !doNotShow;
  },
});
</script>
