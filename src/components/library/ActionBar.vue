<template>
  <q-toolbar class="q-px-none">
    <q-btn
      flat
      dense
      square
      size="0.8rem"
      padding="none"
      :ripple="false"
    >
      <Plus width="16" height="16" />
      <q-tooltip>
        {{ $t("add", { type: $t("project") }) }}
      </q-tooltip>
      <q-menu
        class="menu"
      >
        <q-list dense>
          <q-item
            clickable
            v-close-popup
            @click="addEmptyProject"
          >
            <q-item-section>
              {{ $t("add", { type: $t("project") }) }}
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="addNotebook"
          >
            <q-item-section>
              {{ $t("add", { type: $t("notebook") }) }}
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-close-popup
            @click="addByID"
          >
            <q-item-section>
              {{ $t("create-entry-by", { type: $t("identifier") }) }}
            </q-item-section>
          </q-item>
          <q-item
            clickable
            v-close-popup
            @click="addByFiles('file')"
          >
            <q-item-section>
              {{ $t("create-entry-by", { type: $t("file") }) }}
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

    <q-btn
      flat
      dense
      square
      size="0.7rem"
      padding="none"
      :ripple="false"
    >
      <FilterIcon width="14" height="14" />
      <q-tooltip>{{ $t("view") }}</q-tooltip>
      <q-menu
        class="menu"
      >
        <q-list dense>
          <q-item>
            <q-item-section>
              <q-checkbox
                dense
                v-model="showReferences"
                :label="$t('show', { type: $t('reference') })"
              ></q-checkbox>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section>
              <q-checkbox
                dense
                v-model="showNotebooks"
                :label="$t('show', { type: $t('notebook') })"
              ></q-checkbox>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
    <q-space />

    <q-input
      class="actionbar-input"
      outlined
      :placeholder="$t('search', { type: $t('local') })"
      v-model="searchString"
      debounce="500"
    >
      <template v-slot:append>
        <Search width="16" height="16" class="cursor-pointer" />
        <q-btn-dropdown
          dense
          size="md"
          padding="0"
          :ripple="false"
        >
          <div class="text-center">Search Mode</div>
          <div class="q-gutter-sm q-pa-sm">
            <q-radio
              dense
              v-model="searchMode"
              val="meta"
              label="Meta"
            />
            <q-radio
              dense
              v-model="searchMode"
              val="content"
              label="Content"
            />
          </div>
        </q-btn-dropdown>
      </template>
    </q-input>

    <q-space />

    <q-btn
      flat
      dense
      square
      size="0.8rem"
      padding="none"
      :ripple="false"
      :color="layoutStore.rightMenuSize > 0 ? 'primary' : ''"
      @click="layoutStore.toggleRightMenu()"
    >
      <InfoCircle width="16" height="16" />
      <q-tooltip>{{ $t("info") }}</q-tooltip>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
import { open } from "@tauri-apps/api/dialog";
import { useLayoutStore } from "src/stores/layoutStore";
import { Plus, Filter as FilterIcon, Search, InfoCircle } from "@iconoir/vue";

const layoutStore = useLayoutStore();

const searchString = defineModel("searchString", {
  type: String,
  required: true,
});
const showReferences = defineModel("showReferences", {
  type: Boolean,
  required: true,
  default: true,
});
const showNotebooks = defineModel("showNotebooks", {
  type: Boolean,
  required: true,
  default: true,
});
const searchMode = defineModel("searchMode", {
  type: String,
  required: true,
  default: "meta",
});
const emit = defineEmits([
  "addEmptyProject",
  "addNotebook",
  "addByFiles",
  "addByCollection",
  "showIdentifierDialog",
]);

async function addByFiles(type: string) {
  let filePath: string | string[] | null;
  switch (type) {
    case "file":
      filePath = await open({
        multiple: true,
        filters: [{ name: "*.pdf", extensions: ["pdf"] }],
      });

      if (Array.isArray(filePath)) emit("addByFiles", filePath);
      else if (!filePath) return;
      else emit("addByFiles", [filePath]);

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

function addEmptyProject() {
  emit("addEmptyProject");
}

function addNotebook() {
  emit("addNotebook");
}

function addByID() {
  emit("showIdentifierDialog");
}
</script>
<style lang="scss" scoped>
.actionbar-input {
  .q-field__control {
    height: min(2rem, 40px);
  }
  .q-field__control-container {
    height: min(2rem, 40px);
  }
  .q-field__marginal {
    height: min(2rem, 40px);
  }
}
</style>
