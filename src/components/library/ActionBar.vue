<template>
  <q-toolbar class="q-px-none">
    <q-btn
      flat
      dense
      square
      icon="mdi-plus"
      size="0.8rem"
      padding="none"
      :ripple="false"
    >
      <q-tooltip>
        <i18n-t keypath="add">
          <template #type>{{ $t("project") }}</template>
        </i18n-t>
      </q-tooltip>
      <q-menu square>
        <q-list dense>
          <q-item
            clickable
            v-close-popup
            @click="addEmpty"
          >
            <q-item-section>
              <i18n-t keypath="add">
                <template #type>{{ $t("project") }}</template>
              </i18n-t>
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="addByID"
          >
            <q-item-section>
              <i18n-t keypath="create-entry-by">
                <template #type>{{ $t("identifier") }}</template>
              </i18n-t>
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="addByFiles('file')"
          >
            <q-item-section>
              <i18n-t keypath="create-entry-by">
                <template #type>{{ $t("file") }}</template>
              </i18n-t>
            </q-item-section>
          </q-item>
          <q-separator />
          <q-item
            clickable
            v-close-popup
            @click="addByFiles('collection')"
          >
            <q-item-section>
              {{ $t("import-collection-bib-ris-etc") }}
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

    <q-space />

    <q-input
      outlined
      dense
      square
      class="actionbar-input"
      :placeholder="$t('search', { type: $t('local') })"
      v-model="searchText"
    >
      <template v-slot:append>
        <q-icon
          class="cursor-pointer"
          name="mdi-magnify"
        />
      </template>
    </q-input>

    <q-space />

    <q-btn-toggle
      v-model="stateStore.showLibraryRightMenu"
      clearable
      flat
      dense
      square
      size="0.8rem"
      padding="none"
      :ripple="false"
      toggle-color="primary"
      :options="[{ value: true, icon: 'mdi-format-list-bulleted' }]"
    >
      <q-tooltip>{{ $t("info") }}</q-tooltip>
    </q-btn-toggle>
  </q-toolbar>
</template>

<script setup lang="ts">
// types
import { computed } from "vue";
import { debounce } from "quasar";
import { useStateStore } from "src/stores/appState";
import { open } from "@tauri-apps/api/dialog";

const stateStore = useStateStore();

const props = defineProps({
  searchString: { type: String, required: true },
});
const emit = defineEmits([
  "update:searchString",
  "addEmptyProject",
  "addByFiles",
  "addByCollection",
  "showIdentifierDialog",
]);

const searchText = computed({
  get() {
    return props.searchString;
  },
  set: debounce((text: string) => {
    emit("update:searchString", text);
  }, 500),
});

async function addByFiles(type: string) {
  let filePath: string | string[] | null; //no type checking for now
  switch (type) {
    case "file":
      filePath = await open({
        multiple: true,
        filters: [{ name: "*.pdf", extensions: ["pdf"] }],
      });

      if (Array.isArray(filePath)) emit("addByFiles", filePath);
      else if (!filePath) return;
      else emit("addByFiles", [filePath]); // user selected a single file

      break;
    case "collection":
      filePath = await open({
        multiple: false,
        filters: [
          { name: "*.bib, *.ris, *.json", extensions: ["bib", "ris", "json"] },
        ],
      });
      if (!filePath) return;
      emit("addByCollection", filePath);
      break;
  }
}

function addEmpty() {
  emit("addEmptyProject");
}

function addByID() {
  emit("showIdentifierDialog");
}
</script>
<style lang="scss">
.actionbar-input {
  /* for sizing the q-input */
  .q-field__control {
    height: min(1.8rem, 36px) !important;
  }
  .q-field__marginal {
    height: min(1.8rem, 36px) !important;
  }
}
</style>
