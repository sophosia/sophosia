<template>
  <div
    v-if="visible"
    class="note-page"
  >
    <NoteEditor
      ref="noteEditorRef"
      :has-toolbar="false"
      :noteId="currentNoteId"
      :data="data"
      :save="true"
      @titleChanged="onTitleChanged"
    />
    <div class="word-count-overlay">
      {{ $t("words-count", { count: wordCount }) }}
    </div>
  </div>
</template>
<script setup lang="ts">
import NoteEditor from "src/components/note/NoteEditor.vue";
import { NodeType, Note } from "src/backend/database";
import { useNodeActions } from "src/composables/useNodeActions";
import { PropType, computed, ref, watch } from "vue";

const props = defineProps({
  visible: { type: Boolean, required: true },
  itemId: { type: String, required: true },
  data: { type: Object as PropType<{ path: String }>, required: false },
});

const noteEditorRef = ref<InstanceType<typeof NoteEditor> | null>(null);
const { renameNote, checkDuplicate, pathDuplicate } = useNodeActions();
const currentNoteId = ref(props.itemId);

watch(
  () => props.itemId,
  (newId) => {
    currentNoteId.value = newId;
  }
);

async function onTitleChanged(newTitle: string) {
  if (!newTitle) return;
  const newLabel = newTitle.replace(/[/\\:*?"<>|]/g, "_") + ".md";
  // Skip rename if the label hasn't actually changed
  const currentLabel = currentNoteId.value.split("/").at(-1);
  if (newLabel === currentLabel) return;
  // Check for duplicate filename before renaming
  await checkDuplicate(
    { _id: currentNoteId.value, type: NodeType.MARKDOWN } as Note,
    newLabel
  );
  if (pathDuplicate.value) return;
  await renameNote(
    currentNoteId.value,
    newLabel,
    (newNoteId: string) => {
      currentNoteId.value = newNoteId;
    },
    () => {},
    { silent: true }
  );
}

const wordCount = computed(() => noteEditorRef.value?.wordCount ?? 0);
</script>
<style scoped lang="scss">
.note-page {
  position: absolute;
  inset: 0;
}

.note-page :deep(> div:not(.word-count-overlay)) {
  height: 100%;
}

.note-page :deep(.vditor) {
  border: none;
  border-radius: 0;
}

.note-page :deep(.vditor-toolbar) {
  display: none !important;
}

.word-count-overlay {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: var(--q-text-muted, rgba(255, 255, 255, 0.4));
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 10;
}
</style>
