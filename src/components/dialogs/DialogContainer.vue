<template>
  <ImportDialog />
  <DeleteDialog />
  <IdentifierDialog />
  <ExportDialog />
  <ErrorDialog />
  <SuccessDialog />
  <ProgressDialog />
</template>
<script setup lang="ts">
import DeleteDialog from "./DeleteDialog.vue";
import ErrorDialog from "./ErrorDialog.vue";
import ExportDialog from "./ExportDialog.vue";
import IdentifierDialog from "./IdentifierDialog.vue";
import ImportDialog from "./ImportDialog.vue";
import ProgressDialog from "./ProgressDialog.vue";
import SuccessDialog from "./SuccessDialog.vue";
</script>
