<template>
  <div class="category-tabs">
    <div class="category-tabs-scroll">
      <!-- Special tabs -->
      <button
        v-for="tab in specialTabs"
        :key="tab.id"
        class="category-tab"
        :class="{ active: projectStore.selectedCategory === tab.id }"
        @click="projectStore.selectedCategory = tab.id"
      >
        <component :is="tab.icon" width="12" height="12" />
        <span>{{ $t(tab.id) }}</span>
      </button>

      <!-- User category tabs -->
      <button
        v-for="cat in userCategories"
        :key="cat._id"
        class="category-tab"
        :class="{ active: projectStore.selectedCategory === cat._id }"
        @click="projectStore.selectedCategory = cat._id"
        @contextmenu.prevent="showContextMenu($event, cat)"
      >
        <FolderIcon width="12" height="12" />
        <span>{{ getLabel(cat._id) }}</span>
      </button>

      <!-- Add category button -->
      <button class="category-tab category-tab-add" @click="addCategory">
        <Plus width="12" height="12" />
      </button>
    </div>

    <!-- Context menu for user categories -->
    <q-menu
      v-model="contextMenuVisible"
      :target="contextMenuTarget"
      context-menu
      class="menu"
    >
      <q-list dense>
        <q-item clickable v-close-popup @click="renameCategory">
          <q-item-section>
            <i18n-t keypath="rename">
              <template #type>{{ $t("category") }}</template>
            </i18n-t>
          </q-item-section>
        </q-item>
        <q-item clickable v-close-popup @click="deleteCategory">
          <q-item-section>
            <i18n-t keypath="delete">
              <template #type>{{ $t("category") }}</template>
            </i18n-t>
          </q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, type Component } from "vue";
import { CategoryNode, SpecialCategory } from "src/backend/database";
import { useProjectStore } from "src/stores/projectStore";
import { nameDialog } from "src/components/dialogs/dialogController";
import { useI18n } from "vue-i18n";
import {
  BookStack,
  ClockRotateRight,
  Star,
  Folder as FolderIcon,
  Plus,
} from "@iconoir/vue";

const projectStore = useProjectStore();
const { t } = useI18n({ useScope: "global" });

const specialTabs: { id: string; icon: Component }[] = [
  { id: SpecialCategory.LIBRARY, icon: BookStack },
  { id: SpecialCategory.ADDED, icon: ClockRotateRight },
  { id: SpecialCategory.FAVORITES, icon: Star },
];

const userCategories = ref<CategoryNode[]>([]);
const contextMenuVisible = ref(false);
const contextMenuTarget = ref<EventTarget | null>(null);
const contextMenuCategory = ref<CategoryNode | null>(null);

onMounted(async () => {
  await loadCategories();
});

async function loadCategories() {
  const tree = (await projectStore.getCategoryTree()) as CategoryNode[];
  // The tree root is "library" node — get its children as user categories
  if (tree.length > 0 && tree[0].children) {
    userCategories.value = tree[0].children;
  }
}

function getLabel(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1];
}

function showContextMenu(e: MouseEvent, cat: CategoryNode) {
  contextMenuCategory.value = cat;
  contextMenuTarget.value = e.target;
  contextMenuVisible.value = true;
}

function addCategory() {
  nameDialog.showWithOptions({
    title: t("new", { type: t("category") }),
    placeholder: t("new", { type: t("category") }),
    validate: (name: string) => {
      return userCategories.value.some(
        (c) => getLabel(c._id).toLowerCase() === name.toLowerCase()
      );
    },
  });
  nameDialog.onConfirm(async () => {
    const newId = `library/${nameDialog.name}`;
    // Add to UI
    userCategories.value.push({ _id: newId, children: [] });
    // Select the new category
    projectStore.selectedCategory = newId;
  });
}

async function renameCategory() {
  const cat = contextMenuCategory.value;
  if (!cat) return;
  const oldLabel = getLabel(cat._id);

  nameDialog.showWithOptions({
    title: t("rename", { type: t("category") }),
    placeholder: oldLabel,
    validate: (name: string) => {
      return userCategories.value.some(
        (c) =>
          c._id !== cat._id &&
          getLabel(c._id).toLowerCase() === name.toLowerCase()
      );
    },
  });
  nameDialog.onConfirm(async () => {
    const oldCategory = cat._id;
    const parts = oldCategory.split("/");
    parts[parts.length - 1] = nameDialog.name;
    const newCategory = parts.join("/");

    await projectStore.updateCategory(oldCategory, newCategory);
    cat._id = newCategory;

    if (projectStore.selectedCategory === oldCategory) {
      projectStore.selectedCategory = newCategory;
    }
  });
}

async function deleteCategory() {
  const cat = contextMenuCategory.value;
  if (!cat) return;

  userCategories.value = userCategories.value.filter(
    (c) => c._id !== cat._id
  );
  await projectStore.deleteCategory(cat._id);

  if (projectStore.selectedCategory === cat._id) {
    projectStore.selectedCategory = SpecialCategory.LIBRARY;
  }
}
</script>

<style lang="scss" scoped>
.category-tabs {
  flex-shrink: 0;
  border-bottom: 1px solid var(--q-border);
  background: var(--color-library-toolbar-bkgd);
}

.category-tabs-scroll {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--q-text-muted);
  font-family: inherit;
  font-size: 0.6875rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
  user-select: none;

  &:hover {
    color: var(--q-reg-text);
    background: var(--q-hover);
  }

  &.active {
    color: var(--q-primary);
    background: var(--q-active);
  }
}

.category-tab-add {
  padding: 3px 5px;
  color: var(--q-text-muted);

  &:hover {
    color: var(--q-primary);
    background: var(--q-hover);
  }
}
</style>
