<template>
  <div class="center column items-center">
    <div class="empty-stack">
      {{ $t("welcome") }}
    </div>
    <div class="row justify-around full-width">
      <q-btn
        flat
        square
        padding="xs"
        color="primary"
        style="opacity: 0.5"
        @click="
          $emit('openPage', {
            id: 'library',
            label: 'library',
            type: PageType.LibraryPage,
          })
        "
      >
        <div class="column items-center">
          <q-icon name="mdi-library-outline"></q-icon>
          <div>
            {{ $t("library") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        square
        color="primary"
        style="opacity: 0.5"
        padding="xs"
        @click="$emit('toggleWelcome')"
      >
        <div class="column items-center">
          <q-icon name="mdi-safe"></q-icon>
          <div>
            {{ $t("workspace") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        square
        padding="xs"
        color="primary"
        style="opacity: 0.5"
        @click="
          async () => {
            $emit('openPage', {
              id: 'help',
              label: 'help',
              type: PageType.HelpPage,
              data: {
                path: await resolveResource(
                  `help/help_${db.config.language}.md`
                ),
              },
            });
          }
        "
      >
        <div class="column items-center">
          <q-icon name="mdi-help-circle-outline"></q-icon>
          <div>
            {{ $t("help") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        square
        padding="xs"
        color="primary"
        style="opacity: 0.5"
        @click="
          $emit('openPage', {
            id: 'settings',
            label: 'settings',
            type: PageType.SettingsPage,
          })
        "
      >
        <div class="column items-center">
          <q-icon name="mdi-cog-outline"></q-icon>
          <div>
            {{ $t("settings") }}
          </div>
        </div>
      </q-btn>
    </div>
  </div>
</template>
<script setup lang="ts">
import { resolveResource } from "@tauri-apps/api/path";
import { PageType, db } from "src/backend/database";
const emit = defineEmits(["openPage", "toggleWelcome"]);
</script>
<style scoped lang="scss">
.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.empty-stack {
  color: var(--q-primary);
  opacity: 0.5;
  font-size: 3rem;
}
</style>
