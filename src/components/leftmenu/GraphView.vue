<template>
  <div>
    <div class="q-mx-xl q-my-sm row justify-between">
      <div class="row items-center">
        <div class="square"></div>
        <div
          class="q-ml-xs"
          style="font-size: 0.875rem"
        >
          {{ $t("project") }}
        </div>
      </div>
      <div class="row items-center">
        <div class="circle"></div>
        <div
          class="q-ml-xs"
          style="font-size: 0.875rem"
        >
          {{ $t("note") }}
        </div>
      </div>
      <div class="row items-center">
        <div class="triangle"></div>
        <div
          class="q-ml-xs"
          style="font-size: 0.875rem"
        >
          {{ $t("annotation") }}
        </div>
      </div>
    </div>
    <div
      :style="`height: ${height}px`"
      id="cy"
      ref="graph"
    ></div>
  </div>
</template>

<script setup lang="ts">
// types
import { EdgeUI, NodeUI } from "src/backend/database";
import { inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
// db
import { useLayoutStore } from "src/stores/layoutStore";
// cytoscape
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import { EventBus } from "quasar";
import { getGraph } from "src/backend/graph";
cytoscape.use(cola);

const props = defineProps({
  itemId: { type: String, required: true },
  height: { type: Number, required: true },
});

const layoutStore = useLayoutStore();
const bus = inject("bus") as EventBus;

const graph = ref<HTMLElement>();
const specialPages = ref(["library", "settings"]);

watch(
  () => props.itemId,
  () => {
    setTimeout(() => {
      reload();
    }, 100);
  }
);

onMounted(async () => {
  await reload();
  bus.on("updateGraph", reload);
});

onBeforeUnmount(() => {
  bus.off("updateGraph", reload);
});

/**
 * Reloads the graph data and redraws the graph.
 * @returns {Promise<void>}
 */
async function reload() {
  if (!!!props.itemId || specialPages.value.includes(props.itemId)) return;
  const elements = await getGraph(props.itemId);
  setStyle(elements);
  drawGraph(elements);
}

/**
 * Sets the style of graph elements based on their type.
 * @param {Object} elements - Elements to style.
 */
function setStyle(elements: { nodes: NodeUI[]; edges: EdgeUI[] }) {
  let color = getComputedStyle(document.body).getPropertyValue("--q-reg-text");
  for (let node of elements.nodes) {
    let type = node.data.type;
    if (type === "project") node.data.shape = "rectangle";
    else if (type === "note") node.data.shape = "ellipse";
    else if (type === "annotation") node.data.shape = "triangle";
    node.data.bg = props.itemId === node.data.id ? "#1976d2" : color;
  }
}

/**
 * Draws the graph using Cytoscape.
 * @param {Object} elements - Elements to add to the graph.
 */
function drawGraph(elements: { nodes: NodeUI[]; edges: EdgeUI[] }) {
  if (!graph.value) return;
  let cy = cytoscape({
    container: graph.value,

    boxSelectionEnabled: false,

    style: [
      {
        selector: "node",
        style: {
          shape: "data(shape)",
          label: "data(label)",
          "text-wrap": "ellipsis",
          "text-max-width": "15em",
          color: function (el: cytoscape.NodeSingular) {
            return el.data("bg");
          },
          "background-color": function (el) {
            return el.data("bg");
          },
        },
        css: {
          "text-valign": "top",
          "text-halign": "center",
        },
      },
      {
        selector: ":parent",
        css: {
          "background-color": "grey",
        },
      },
      {
        selector: "edge",
        css: {
          "target-arrow-shape": "triangle",
          "curve-style": "straight",
        },
      },
    ] as cytoscape.Stylesheet[],

    elements: elements,

    layout: {
      name: "cola" as any, // cytoscape's type is not good
      animate: false,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
    },
  });

  cy.on("tap", "node", function () {
    // MUST use function(){} in order to use this.data
    // this.data is the data of the node
    // we cannot use this to access this.stateStore now
    layoutStore.openItem(this.data("id") as string);
  });
}

defineExpose({ reload });
</script>
