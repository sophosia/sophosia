<template>
  <div class="pdf-reader">
    <div
      v-if="loading"
      class="state"
    >
      <q-circular-progress
        indeterminate
        rounded
        color="primary"
        size="xl"
      />
    </div>
    <div
      v-else-if="errorMessage"
      class="state error"
    >
      {{ errorMessage }}
    </div>
    <PDFViewer
      v-else-if="viewerConfig"
      ref="pdfViewerRef"
      :key="sourceUrl"
      class="embedpdf-viewer"
      :config="viewerConfig"
      @ready="onViewerReady"
    />
  </div>
</template>

<script setup lang="ts">
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { PDFViewer } from "@embedpdf/vue-pdf-viewer";
import type {
  PdfAnnotationObject,
  PdfDocumentObject,
  PluginRegistry,
} from "@embedpdf/vue-pdf-viewer";
import type { Project } from "src/backend/database";
import { getProject } from "src/backend/project";
import {
  LEGACY_ANNOTATION_SOURCE,
  deleteLegacyAnnotation,
  embedToLegacyAnnotation,
  legacyToEmbedAnnotation,
  loadLegacyAnnotations,
  saveLegacyAnnotation,
  shouldMigrateLegacyType,
} from "src/backend/pdfreader/embedAnnotationMigration";
import { onBeforeUnmount, computed, ref, watch } from "vue";

const props = defineProps({
  projectId: { type: String, required: true },
  focusAnnotId: { type: String, required: false },
});

const loading = ref(false);
const sourceUrl = ref("");
const errorMessage = ref("");
const viewerRegistry = ref<PluginRegistry | null>(null);
const pdfViewerRef = ref<InstanceType<typeof PDFViewer> | null>(null);

let clearViewerSubscriptions: Array<() => void> = [];
let importingLegacy = false;

function injectCompactToolbarStyles() {
  const el = pdfViewerRef.value?.$el;
  if (!el) return;
  const container = el.querySelector("embedpdf-container");
  if (!container?.shadowRoot) return;
  const style = document.createElement("style");
  style.textContent = `
    [data-epdf-i="main-toolbar"] {
      height: 40px;
      padding-block: 0;
      box-sizing: border-box;
    }
    [data-epdf-i="main-toolbar"] button {
      height: 28px;
      min-height: 28px;
      min-width: 28px;
    }
    [data-epdf-i="main-toolbar"] .h-\\[32px\\] {
      height: 28px;
    }
    [data-epdf-i="document-menu-button"],
    [data-epdf-i="sidebar-button"],
    [data-epdf-i="page-settings-button"],
    [data-epdf-i="overflow-left-action-menu-button"],
    [data-epdf-i="divider-1"],
    [data-epdf-i="divider-2"] {
      display: none !important;
    }
  `;
  container.shadowRoot.appendChild(style);
}

type TrackedAnnotation = { object: PdfAnnotationObject };
type AnnotationStateLike = { byUid: Record<string, TrackedAnnotation> };
type AnnotationEventLike = {
  type: "create" | "update" | "delete" | "loaded";
  annotation: PdfAnnotationObject;
  committed: boolean;
};
type AnnotationCapabilityLike = {
  getState(documentId?: string): AnnotationStateLike;
  importAnnotations(items: Array<{ annotation: PdfAnnotationObject }>): void;
  selectAnnotation(pageIndex: number, annotationId: string): void;
  onAnnotationEvent(listener: (event: AnnotationEventLike) => void): () => void;
};
type DocumentManagerCapabilityLike = {
  getActiveDocument(): PdfDocumentObject | null;
  onDocumentOpened(listener: () => void): () => void;
};
type ScrollCapabilityLike = {
  scrollToPage(options: {
    pageNumber: number;
    pageCoordinates?: { x: number; y: number };
    behavior?: "auto" | "smooth" | "instant";
  }): void;
};

function cleanupViewerSubscriptions() {
  for (const clear of clearViewerSubscriptions) clear();
  clearViewerSubscriptions = [];
}

function getCapability<T>(registry: PluginRegistry, pluginId: string): T | null {
  const plugin = registry.getPlugin(pluginId) as
    | { provides?: () => T }
    | null;
  if (!plugin || typeof plugin.provides !== "function") return null;
  return plugin.provides();
}

const viewerConfig = computed(() => {
  if (!sourceUrl.value) return null;
  return {
    src: sourceUrl.value,
    theme: {
      preference: "dark" as const,
      dark: {
        accent: {
          primary: "#818cf8",
          primaryHover: "#6366f1",
          primaryActive: "#4f46e5",
          primaryLight: "rgba(129, 140, 248, 0.18)",
          primaryForeground: "#ffffff",
        },
        background: {
          app: "#0f1117",
          surface: "#1a1b23",
          surfaceAlt: "#1a1b23",
          elevated: "#252630",
          overlay: "rgba(0, 0, 0, 0.5)",
          input: "#252630",
        },
        foreground: {
          primary: "#e4e4e7",
          secondary: "#8b8d98",
          muted: "#8b8d98",
          disabled: "#52525b",
          onAccent: "#ffffff",
        },
        border: {
          default: "#2e3040",
          strong: "#3f3f46",
          subtle: "rgba(255, 255, 255, 0.06)",
        },
        interactive: {
          hover: "rgba(255, 255, 255, 0.05)",
          active: "rgba(129, 140, 248, 0.18)",
          selected: "rgba(129, 140, 248, 0.12)",
          focus: "#818cf8",
        },
      },
    },
    annotations: {
      annotationAuthor: "Sophosia",
    },
  };
});

async function loadProjectPdf(projectId: string) {
  loading.value = true;
  errorMessage.value = "";
  sourceUrl.value = "";

  try {
    const project = (await getProject(projectId, {
      includePDF: true,
    })) as Project | undefined;

    if (!project?.path) {
      errorMessage.value = "No PDF file found for this project.";
      return;
    }

    sourceUrl.value = convertFileSrc(project.path);
  } catch (error) {
    console.error(error);
    errorMessage.value = "Unable to load this PDF file.";
  } finally {
    loading.value = false;
  }
}

async function migrateLegacyAnnotationsForActiveDocument(
  annotationCapability: AnnotationCapabilityLike,
  documentManager: DocumentManagerCapabilityLike
) {
  const document = documentManager.getActiveDocument();
  if (!document) return;

  const legacyAnnotations = await loadLegacyAnnotations(props.projectId);
  if (!legacyAnnotations.length) return;

  const existing =
    annotationCapability.getState(document.id)?.byUid ||
    annotationCapability.getState()?.byUid ||
    {};
  const existingIds = new Set(Object.keys(existing));
  const importItems = [] as Array<{ annotation: PdfAnnotationObject }>;

  for (const annotation of legacyAnnotations) {
    if (!shouldMigrateLegacyType(annotation.type)) continue;
    if (!annotation._id || existingIds.has(annotation._id)) continue;
    const converted = legacyToEmbedAnnotation(annotation, document);
    if (!converted) continue;
    importItems.push({ annotation: converted });
  }

  if (!importItems.length) return;
  importingLegacy = true;
  try {
    annotationCapability.importAnnotations(importItems);
  } finally {
    importingLegacy = false;
  }
}

async function syncAnnotationEventToLegacyStore(
  event: AnnotationEventLike,
  documentManager: DocumentManagerCapabilityLike
) {
  if (importingLegacy) return;
  if (event.type === "loaded") return;
  if (!event.annotation?.id) return;
  if (!event.committed) return;

  if (event.type === "delete") {
    await deleteLegacyAnnotation(event.annotation.id);
    return;
  }

  const document = documentManager.getActiveDocument();
  if (!document) return;
  const annotation = embedToLegacyAnnotation(
    event.annotation,
    props.projectId,
    document
  );
  if (!annotation) return;
  await saveLegacyAnnotation(annotation);
}

function focusAnnotationIfNeeded(
  annotationCapability: AnnotationCapabilityLike,
  scrollCapability: ScrollCapabilityLike | null
) {
  if (!props.focusAnnotId) return;
  const state = annotationCapability.getState();
  const target = state?.byUid?.[props.focusAnnotId];
  if (!target?.object) return;

  const annotation = target.object;
  annotationCapability.selectAnnotation(annotation.pageIndex, annotation.id);
  if (scrollCapability) {
    scrollCapability.scrollToPage({
      pageNumber: annotation.pageIndex + 1,
      pageCoordinates: {
        x: annotation.rect.origin.x,
        y: annotation.rect.origin.y,
      },
      behavior: "smooth",
    });
  }
}

async function onViewerReady(registry: PluginRegistry) {
  viewerRegistry.value = registry;
  cleanupViewerSubscriptions();
  injectCompactToolbarStyles();

  const annotationCapability = getCapability<AnnotationCapabilityLike>(
    registry,
    "annotation"
  );
  const documentManager = getCapability<DocumentManagerCapabilityLike>(
    registry,
    "document-manager"
  );
  const scrollCapability = getCapability<ScrollCapabilityLike>(registry, "scroll");
  if (!annotationCapability || !documentManager) return;

  const migrateAndFocus = async () => {
    await migrateLegacyAnnotationsForActiveDocument(
      annotationCapability,
      documentManager
    );
    focusAnnotationIfNeeded(annotationCapability, scrollCapability);
  };

  clearViewerSubscriptions.push(
    documentManager.onDocumentOpened(async () => {
      await migrateAndFocus();
    })
  );

  clearViewerSubscriptions.push(
    annotationCapability.onAnnotationEvent(async (event) => {
      if (
        event.annotation?.custom?.source === LEGACY_ANNOTATION_SOURCE &&
        importingLegacy
      ) {
        return;
      }
      await syncAnnotationEventToLegacyStore(event, documentManager);
    })
  );

  await migrateAndFocus();
}

watch(
  () => props.projectId,
  async (projectId) => {
    cleanupViewerSubscriptions();
    viewerRegistry.value = null;
    await loadProjectPdf(projectId);
  },
  { immediate: true }
);

watch(
  () => props.focusAnnotId,
  () => {
    const registry = viewerRegistry.value;
    if (!registry) return;
    const annotationCapability = getCapability<AnnotationCapabilityLike>(
      registry,
      "annotation"
    );
    const scrollCapability = getCapability<ScrollCapabilityLike>(registry, "scroll");
    if (!annotationCapability) return;
    focusAnnotationIfNeeded(annotationCapability, scrollCapability);
  }
);

onBeforeUnmount(() => {
  cleanupViewerSubscriptions();
  viewerRegistry.value = null;
});
</script>

<style lang="scss" scoped>
.pdf-reader {
  position: relative;
  width: 100%;
  height: 100%;
  background: var(--color-pdfreader-viewer-bkgd);
}

.embedpdf-viewer {
  width: 100%;
  height: 100%;
}

.state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error {
  color: var(--q-negative, #c10015);
}
</style>
