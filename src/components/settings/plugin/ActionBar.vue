<template>
  <q-toolbar>
    <q-btn
      v-if="showAddBtn"
      flat
      dense
      square
      size="0.8rem"
      padding="none"
      @click="togglePluginStore(true)"
    >
      <Plus width="16" height="16" />
      <q-tooltip>{{ $t("add-plugins") }}</q-tooltip>
    </q-btn>
    <q-space v-if="showAddBtn" />
    <q-input
      outlined
      dense
      square
      class="actionbar-input"
      :placeholder="$t('search')"
      type="text"
      v-model="searchText"
    >
      <template v-slot:append>
        <Search
          width="16"
          height="16"
          class="cursor-pointer"
        />
      </template>
    </q-input>
    <q-space />
    <q-btn
      v-if="showCloseBtn"
      flat
      dense
      square
      v-close-popup
      size="0.8rem"
      padding="none"
    >
      <Xmark width="16" height="16" />
      <q-tooltip>{{ $t("close") }}</q-tooltip>
    </q-btn>
  </q-toolbar>
</template>
<script setup lang="ts">
import { debounce } from "quasar";
import { computed, inject } from "vue";
import { Plus, Search, Xmark } from "@iconoir/vue";

const props = defineProps({
  search: { type: String, required: true },
  showAddBtn: { type: Boolean, required: true },
  showCloseBtn: { type: Boolean, required: true },
});
const emit = defineEmits(["update:search"]);

const searchText = computed({
  get() {
    return props.search;
  },
  set: debounce((text: string | number | null) => {
    emit("update:search", typeof text === "number" ? text.toString() : text);
  }),
});

const togglePluginStore = inject("togglePluginStore") as (
  show: boolean
) => void;
</script>
<style scoped lang="scss">
.actionbar-input {
  border-radius: 8px;
}
</style>
