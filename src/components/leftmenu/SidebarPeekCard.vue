<template>
  <q-card
    v-show="cardVisible"
    ref="card"
    class="sidebar-peek-card"
    :style="cardStyle"
    @mouseenter="$emit('cardEnter')"
    @mouseleave="$emit('cardLeave')"
  >
    <!-- Markdown note preview -->
    <q-card-section
      v-if="contentType === 'markdown'"
      class="q-pa-sm sidebar-peek-card-scroll"
    >
      <div
        ref="mdContentDiv"
        class="contentPane"
      ></div>
    </q-card-section>

    <!-- Excalidraw note -->
    <q-card-section
      v-else-if="contentType === 'excalidraw'"
      class="q-pa-md"
    >
      <div class="text-subtitle2 ellipsis">
        {{ node?.label?.replace(/\.excalidraw$/, "") }}
      </div>
      <div class="text-caption text-grey">Excalidraw canvas</div>
    </q-card-section>

    <!-- PDF paper preview -->
    <div
      v-else-if="contentType === 'pdf'"
      class="peek-pdf-container"
    >
      <PDFViewer
        v-if="pdfConfig"
        :config="pdfConfig"
        class="peek-pdf-viewer"
        @ready="onPdfReady"
      />
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { PDFViewer } from "@embedpdf/vue-pdf-viewer";
import type { PluginRegistry } from "@embedpdf/vue-pdf-viewer";
import { loadNote } from "src/backend/note";
import { getProject } from "src/backend/project";
import type { ProjectNode, Project } from "src/backend/database";
import { useSettingStore } from "src/stores/settingStore";
import Vditor from "vditor/dist/method.min";
import { ref, computed, watch, nextTick } from "vue";

const settingStore = useSettingStore();

const props = defineProps<{
  node: ProjectNode | null;
  visible: boolean;
  anchorRect: { top: number; left: number; right: number; bottom: number } | null;
}>();

defineEmits(["cardEnter", "cardLeave"]);

const card = ref();
const mdContentDiv = ref();
const contentType = ref<"markdown" | "excalidraw" | "pdf" | null>(null);
const pdfSourceUrl = ref("");
const contentReady = ref(false);

// Only show card when parent says visible AND content is actually ready to display
const cardVisible = computed(() => props.visible && contentReady.value);

const CARD_WIDTH = 500;
const CARD_MAX_HEIGHT = 400;

const cardStyle = computed(() => {
  if (!props.anchorRect) return {};
  const left = props.anchorRect.right + 4;
  let top = props.anchorRect.top;

  // Clamp so card doesn't overflow bottom of viewport
  const maxTop = window.innerHeight - CARD_MAX_HEIGHT - 8;
  if (top > maxTop) top = Math.max(8, maxTop);

  return {
    left: `${left}px`,
    top: `${top}px`,
  };
});

const pdfConfig = computed(() => {
  if (!pdfSourceUrl.value) return null;
  const isDark = settingStore.theme === "dark";
  return {
    src: pdfSourceUrl.value,
    zoom: {
      defaultZoomLevel: "fit-width",
    },
    theme: {
      preference: isDark ? ("dark" as const) : ("light" as const),
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
      light: {
        accent: {
          primary: "#6366f1",
          primaryHover: "#4f46e5",
          primaryActive: "#4338ca",
          primaryLight: "rgba(99, 102, 241, 0.12)",
          primaryForeground: "#ffffff",
        },
        background: {
          app: "#ffffff",
          surface: "#f9fafb",
          surfaceAlt: "#f3f4f6",
          elevated: "#ffffff",
          overlay: "rgba(0, 0, 0, 0.3)",
          input: "#ffffff",
        },
        foreground: {
          primary: "#1f2937",
          secondary: "#6b7280",
          muted: "#9ca3af",
          disabled: "#d1d5db",
          onAccent: "#ffffff",
        },
        border: {
          default: "#e5e7eb",
          strong: "#d1d5db",
          subtle: "rgba(0, 0, 0, 0.06)",
        },
        interactive: {
          hover: "rgba(0, 0, 0, 0.04)",
          active: "rgba(99, 102, 241, 0.12)",
          selected: "rgba(99, 102, 241, 0.08)",
          focus: "#6366f1",
        },
      },
    },
  };
});

function injectPeekStyles() {
  const el = card.value?.$el;
  if (!el) return;
  const container = el.querySelector("embedpdf-container");
  if (!container?.shadowRoot) return;
  const style = document.createElement("style");
  style.textContent = `
    [data-epdf-i="main-toolbar"] { display: none !important; }
    [data-epdf-i="sidebar-button"] { display: none !important; }
    [data-epdf-i="page-counter"] { display: none !important; }
    [data-epdf-i="page-navigation"] { display: none !important; }
  `;
  container.shadowRoot.appendChild(style);
}

function onPdfReady(registry: PluginRegistry) {
  injectPeekStyles();

  // Wait for the document to actually open before showing the card
  const docPlugin = registry.getPlugin("document-manager") as
    | { provides?: () => { onDocumentOpened(listener: () => void): () => void } }
    | null;
  if (docPlugin?.provides) {
    const docManager = docPlugin.provides();
    const unsubscribe = docManager.onDocumentOpened(() => {
      contentReady.value = true;
      unsubscribe();
    });
  } else {
    contentReady.value = true;
  }
}

watch(
  () => props.node,
  async (node) => {
    // Reset state
    contentType.value = null;
    pdfSourceUrl.value = "";
    contentReady.value = false;

    if (!node) return;

    try {
      if (node.dataType === "note") {
        if (node._id.endsWith(".excalidraw")) {
          contentType.value = "excalidraw";
          contentReady.value = true;
        } else {
          // Set contentType first so the mdContentDiv enters the DOM
          contentType.value = "markdown";
          const content = await loadNote(node._id);
          // Wait for Vue to mount the markdown div
          await nextTick();
          if (mdContentDiv.value && content) {
            Vditor.preview(mdContentDiv.value, content, {
              theme: settingStore.theme === "dark" ? "dark" : "classic",
              mode: settingStore.theme,
              hljs: {
                lineNumber: true,
                style: settingStore.theme === "dark" ? "native" : "emacs",
              },
              cdn: "vditor",
            });
          }
          contentReady.value = true;
        }
      } else if (node.dataType === "paper") {
        const projectId = node._id.split("/")[0];
        const project = (await getProject(projectId, {
          includePDF: true,
        })) as Project | undefined;
        if (project?.pdfs?.length) {
          contentType.value = "pdf";
          const pdfName = node.label;
          const pdf =
            project.pdfs.find((p) => p.name === pdfName) || project.pdfs[0];
          if (pdf) {
            pdfSourceUrl.value = convertFileSrc(pdf.path);
          }
          // contentReady stays false — onPdfReady will set it when PDF renders
        }
      }
    } catch (error) {
      console.error("SidebarPeekCard: failed to load content", error);
    }
  }
);
</script>
