<template>
  <q-toolbar class="q-px-none">
    <q-btn
      flat
      dense
      square
      icon="mdi-plus"
      size="0.8rem"
      padding="xs"
      :ripple="false"
    >
      <q-tooltip>
        {{ $t("add", { type: $t("project") }) }}
      </q-tooltip>
      <q-menu
        square
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
      icon="mdi-filter-cog-outline"
      size="0.7rem"
      padding="none"
      :ripple="false"
    >
      <q-tooltip>{{ $t("view") }}</q-tooltip>
      <q-menu
        square
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
        <q-icon
          class="cursor-pointer"
          name="mdi-magnify"
        />
        <q-btn-dropdown
          dense
          size="md"
          padding="0"
          :ripple="false"
          dropdown-icon="mdi-chevron-down"
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
      icon="mdi-information-outline"
      size="0.8rem"
      padding="xs"
      :ripple="false"
      :color="layoutStore.rightMenuSize > 0 ? 'primary' : ''"
      @click="layoutStore.toggleRightMenu()"
    >
      <q-tooltip>{{ $t("info") }}</q-tooltip>
    </q-btn>
  </q-toolbar>
</template>

<script setup lang="ts">
// types
import { open } from "@tauri-apps/api/dialog";
import { useLayoutStore } from "src/stores/layoutStore";

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

/**
 * Opens a file dialog and adds projects based on the selected files.
 * Handles different types of file imports, including single files or collections.
 * @param {string} type - The type of file import ('file' or 'collection').
 */
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

/**
 * Emits an event to trigger the creation of an empty project.
 */
function addEmptyProject() {
  emit("addEmptyProject");
}

/**
 * Emits an event to trigger the creation of an empty notebook.
 */
function addNotebook() {
  emit("addNotebook");
}

/**
 * Emits an event to show the dialog for adding a project by identifier.
 */
function addByID() {
  emit("showIdentifierDialog");
}
</script>
<stlye lang="scss" scoped>
//here to prevent conflict with general tabs selector in global scss file
.actionbar-input {
  .q-field__control {
    height: min(2rem, 36px);
  }
  .q-field__control-container {
    height: min(2rem, 36px);
  }
  .q-field__marginal {
    height: min(2rem, 36px);
  }
}
</stlye>
