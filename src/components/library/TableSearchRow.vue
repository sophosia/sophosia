<template>
  <q-tr v-if="text">
    <q-td colspan="100%">
      <div
        :style="`width: ${width}px;`"
        style="font-size: 0.9rem"
        class="q-px-lg ellipsis text-grey"
        v-html="text"
        data-cy="text"
      ></div>
    </q-td>
  </q-tr>
</template>
<script setup lang="ts">
const props = defineProps({ text: String, width: Number });
</script>
