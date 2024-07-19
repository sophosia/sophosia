<template>
  <div class="row full-width justify-evenly">
    <div
      class="social-media"
      @click="$emit('signInWithOAuth', 'google')"
    >
      <q-icon
        size="2rem"
        name="mdi-google"
      />
    </div>
    <div
      class="social-media"
      @click="$emit('signInWithOAuth', 'github')"
    >
      <q-icon
        size="2rem"
        name="mdi-github"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
const emit = defineEmits(["signInWithOAuth"]);
</script>
<style scoped>
.social-media {
  border: 1px solid rgba(128, 128, 128, 0.5);
  border-radius: 0.5rem;
  padding: 1rem 3rem;
  background-color: var(--q-dark-page);
  cursor: pointer;
}
</style>
