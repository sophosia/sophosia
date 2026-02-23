<template>
  <div class="index-section">
    <div class="index-header">
      <span class="index-title">{{ $t("index-files") }}</span>
      <q-btn
        class="btn q-ml-sm"
        no-caps
        :ripple="false"
        :label="$t('index-files')"
        @click="$emit('indexFiles')"
      />
    </div>
    <div class="index-info">
      {{ $t("index-files-info") }}
    </div>
  </div>
</template>
<script setup lang="ts">
const emit = defineEmits(["indexFiles"]);
</script>
<style lang="scss" scoped>
.index-section {
  padding: 16px 0;
}

.index-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.index-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--q-reg-text);
}

.index-info {
  font-size: 0.8125rem;
  color: var(--q-text-muted);
  line-height: 1.5;
}
</style>
