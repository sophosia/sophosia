<template>
  <div class="center column items-center">
    <div class="empty-stack-title">
      {{ $t("welcome") }}
    </div>
    <div class="row justify-around q-mt-lg" style="gap: 24px">
      <q-btn
        flat
        class="empty-stack-btn"
        @click="
          $emit('openPage', {
            id: 'library',
            label: 'library',
            type: PageType.LibraryPage,
          })
        "
      >
        <div class="column items-center" style="gap: 8px">
          <BookStack width="24" height="24" />
          <div class="empty-stack-label">
            {{ $t("library") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        class="empty-stack-btn"
        @click="
          $emit('openPage', {
            id: 'workspace',
            label: 'workspace',
            type: PageType.WorkspacePage,
          })
        "
      >
        <div class="column items-center" style="gap: 8px">
          <Folder width="24" height="24" />
          <div class="empty-stack-label">
            {{ $t("workspace") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        class="empty-stack-btn"
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
        <div class="column items-center" style="gap: 8px">
          <HelpCircle width="24" height="24" />
          <div class="empty-stack-label">
            {{ $t("help") }}
          </div>
        </div>
      </q-btn>
      <q-btn
        flat
        class="empty-stack-btn"
        @click="
          $emit('openPage', {
            id: 'settings',
            label: 'settings',
            type: PageType.SettingsPage,
          })
        "
      >
        <div class="column items-center" style="gap: 8px">
          <Settings width="24" height="24" />
          <div class="empty-stack-label">
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
import { BookStack, Folder, HelpCircle, Settings } from "@iconoir/vue";

const emit = defineEmits(["openPage"]);
</script>
<style scoped lang="scss">
.center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.empty-stack-title {
  color: var(--q-primary);
  font-size: 2rem;
  font-weight: 600;
  opacity: 0.7;
}

.empty-stack-btn {
  color: var(--q-text-muted);
  padding: 16px;
  border-radius: 12px;
  transition: color 0.2s ease, background-color 0.2s ease;

  &:hover {
    color: var(--q-primary);
    background: var(--q-main-highlight);
  }
}

.empty-stack-label {
  font-size: 0.8125rem;
  font-weight: 500;
}
</style>
