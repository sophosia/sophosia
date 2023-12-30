<template>
  <q-menu
    touch-position
    context-menu
    square
    auto-close
    transition-duration="0"
    data-cy="menu"
  >
    <q-list
      v-if="menuType === 'note'"
      dense
    >
      <q-item
        clickable
        @click="$emit('copyId')"
      >
        <q-item-section>
          <i18n-t keypath="copy-id">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        v-close-popup
        @click="$emit('copyAsLink')"
      >
        <q-item-section>
          <i18n-t keypath="copy-as-link">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-separator />
      <q-item
        clickable
        @click="$emit('showInExplorer')"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>

      <q-separator />

      <q-item
        clickable
        @click="$emit('openItem')"
        data-cy="btn-open-item"
      >
        <q-item-section>
          <i18n-t keypath="open">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        @click="$emit('setRenaming')"
      >
        <q-item-section>
          <i18n-t keypath="rename">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        @click="$emit('deleteItem')"
      >
        <q-item-section>
          <i18n-t keypath="delete">
            <template #type>{{ $t("note") }}</template>
          </i18n-t>
        </q-item-section>
      </q-item>
    </q-list>

    <q-list
      v-else-if="menuType === 'folder'"
      dense
    >
      <q-item
        clickable
        @click="$emit('showInExplorer')"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>
    </q-list>

    <q-list
      v-else-if="menuType === 'project'"
      dense
    >
      <q-item
        clickable
        @click="$emit('openItem')"
      >
        <q-item-section>
          <i18n-t keypath="open">
            <template #type>PDF</template>
          </i18n-t>
        </q-item-section>
      </q-item>
      <q-item
        clickable
        @click="$emit('showInExplorer')"
      >
        <q-item-section>{{ $t("show-in-explorer") }}</q-item-section>
      </q-item>

      <q-item
        clickable
        @click="$emit('renamePDF')"
      >
        <q-item-section>{{ $t("rename-pdf-from-metadata") }}</q-item-section>
      </q-item>
    </q-list>
  </q-menu>
</template>
<script setup lang="ts">
const props = defineProps({
  menuType: { type: String, required: true },
});
const emit = defineEmits([
  "copyId",
  "copyAsLink",
  "showInExplorer",
  "openItem",
  "deleteItem",
  "setRenaming",
  "renamePDF",
]);
</script>
