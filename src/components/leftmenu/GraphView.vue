<template>
  <div>
    <div class="q-mx-xl q-my-sm row justify-between">
      <div class="row items-center">
        <div class="square"></div>
        <div
          class="q-ml-xs"
          style="font-size: 1rem"
        >
          {{ $t("project") }}
        </div>
      </div>
      <div class="row items-center">
        <div class="circle"></div>
        <div
          class="q-ml-xs"
          style="font-size: 1rem"
        >
          {{ $t("note") }}
        </div>
      </div>
      <div class="row items-center">
        <div class="triangle"></div>
        <div
          class="q-ml-xs"
          style="font-size: 1rem"
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
import { inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { NodeUI, EdgeUI } from "src/backend/database";
// db
import { useStateStore } from "src/stores/appState";
// cytoscape
import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import { EventBus } from "quasar";
import { getGraph } from "src/backend/project/graph";
cytoscape.use(cola);

const props = defineProps({
  itemId: { type: String, required: true },
  height: { type: Number, required: true },
});

const stateStore = useStateStore();
const bus = inject("bus") as EventBus;

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

async function reload() {
  if (!!!props.itemId || specialPages.value.includes(props.itemId)) return;
  const elements = await getGraph(props.itemId);
  setStyle(elements);
  drawGraph(elements);
}

/**
 * Note centered local graph
 */
function setStyle(elements: { nodes: NodeUI[]; edges: EdgeUI[] }) {
  let color = getComputedStyle(document.body).getPropertyValue("--color-text");
  for (let node of elements.nodes) {
    let type = node.data.type;
    if (type === "project") node.data.shape = "rectangle";
    else if (type === "note") node.data.shape = "ellipse";
    else if (type === "annotation") node.data.shape = "triangle";
    node.data.bg = props.itemId === node.data.id ? "#1976d2" : color;
  }
}

function drawGraph(elements: { nodes: NodeUI[]; edges: EdgeUI[] }) {
  let cy = cytoscape({
    container: document.getElementById("cy"),

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
    stateStore.openItem(this.data("id") as string);
  });
}

defineExpose({ reload });
</script>
<style scoped>
.square {
  width: 1rem;
  height: 1rem;
  background: var(--color-text);
}
.circle {
  width: 1rem;
  height: 1rem;
  background: var(--color-text);
  border-radius: 50%;
}
.triangle {
  width: 0;
  height: 0;
  border-left: 0.6rem solid transparent;
  border-right: 0.6rem solid transparent;
  border-bottom: 1rem solid var(--color-text);
}
</style>
