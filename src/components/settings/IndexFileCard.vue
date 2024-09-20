<template>
  <q-card
    flat
    class="q-my-md card"
  >
    <q-card-section>
      <div class="row">
        <div class="text-h6">{{ $t("index-files") }}</div>
        <q-btn
          class="btn q-ml-sm"
          no-caps
          :ripple="false"
          :label="$t('index-files')"
          @click="$emit('indexFiles')"
        ></q-btn>
      </div>
    </q-card-section>

    <q-card-section class="q-pt-none">
      {{ $t("index-files-info") }}
    </q-card-section>
  </q-card>
</template>
<script setup lang="ts">
const emit = defineEmits(["indexFiles"]);
</script>
