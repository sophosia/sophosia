<template>
  <q-dialog
    v-model="deleteDialog.visible"
    persistent
    no-shake
    @hide="deleteDialog.close()"
  >
    <q-card class="dialog">
      <q-card-section>
        <div
          v-if="deleteDialog.isDeleteFromDB"
          class="text-h6"
        >
          {{ $t("permenantly-delete") }}
        </div>
        <div
          v-else
          class="text-h6"
        >
          {{ $t("delete") }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <strong>
          {{ $t("are-you-sure-you-want-to-delete-the-following-project") }}
        </strong>
        <ul>
          <li v-for="project in deleteDialog.deleteProjects">
            "{{ project.title }}"
          </li>
        </ul>
        <strong v-if="deleteDialog.isDeleteFromDB">
          <div>{{ $t("this-operation-is-not-reversible") }}</div>
          <div>{{ $t("notes-in-this-project-will-be-deleted") }}</div>
        </strong>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          @click="deleteDialog.close()"
          data-cy="btn-cancel"
        >
          {{ $t("cancel") }}
        </q-btn>
        <q-btn
          flat
          square
          v-close-popup
          :ripple="false"
          @click="deleteDialog.confirm()"
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
import { deleteDialog } from "./dialogController";
</script>
