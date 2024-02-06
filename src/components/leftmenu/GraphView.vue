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
import { EdgeUI, NodeUI } from "src/backend/database";
import { inject, onBeforeUnmount, onMounted, ref, Ref, watch } from "vue";
// db
import { useLayoutStore } from "src/stores/layoutStore";

//d3
import * as d3 from "d3";

import { EventBus } from "quasar";
import { getGraph } from "src/backend/project/graph";

const props = defineProps({
  itemId: { type: String, required: true },
  height: { type: Number, required: true },
  width: { type: Number, required: true }
});

const layoutStore = useLayoutStore();
const bus = inject("bus") as EventBus;
const graph: Ref<HTMLElement | null> = ref(null);
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
  if (graph.value) {
    await reload();
  }
  bus.on("updateGraph", reload);
});

onBeforeUnmount(() => {
  bus.off("updateGraph", reload);
});

/**
 * Reloads the graph data and redraws the graph.
 * @returns {Promise<void>}
 */
async function reload(): Promise<void> {
  if (!!!props.itemId || specialPages.value.includes(props.itemId)) return;
  const elements = await getGraph(props.itemId);
  console.log("elments", elements);

  const chart = ForceGraph(
    { nodes: elements.nodes, links: elements.edges },
    {
      nodeId: (d: { data: { id: any } }) => d.data.id,
      nodeGroup: (d: { data: { type: any } }) => d.data.type,
      nodeGroups: [], // Add nodeGroups property
      nodeTitle: (d: { data: { label: any; type: any } }) =>
        `${d.data.label}\n ${d.data.type}`,
      nodeStrength: 1, // Add nodeStrength property
      linkStrength: 1, // Add linkStrength property
      height: props.height,
      width: props.width,
      invalidation: null // Add invalidation property
    }
  );

  console.log(chart);

  if (graph.value) {
    graph.value.innerHTML = "";
    graph.value.appendChild(chart); // Append your SVG
  }
}

//D3 implementation

// Copyright 2021-2023 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/force-directed-graph
function ForceGraph(
  {
    nodes,
    links // an iterable of link objects (typically [{source, target}, …])
  },
  {
    nodeId = (d: { data: { id: any } }) => d.data.id, // given d in nodes, returns a unique identifier (string)
    // Remove the duplicate declaration of 'any' type
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 5, // node radius, in pixels
    nodeStrength = 2,
    linkSource = (d: { data: { source: any } }) => d.data.source, // given d in links, returns a node identifier string
    linkTarget = (d: { data: { target: any } }) => d.data.target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1.5, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength = 1,
    colors = d3.schemeTableau10, // an array of color strings, for the node groups
    width, // outer width, in pixels
    height // outer height, in pixels
  } = {}
) {
  // Compute values.

  const N = d3.map(nodes, nodeId).map(intern);
  const LS = d3.map(links, linkSource).map(intern);
  const LT = d3.map(links, linkTarget).map(intern);
  if (nodeTitle === undefined) nodeTitle = (_: any, i: string | number) => N[i];
  const T = nodeTitle == null ? null : d3.map(nodes, nodeTitle);
  const G = nodeGroup == null ? null : d3.map(nodes, nodeGroup).map(intern);
  const W =
    typeof linkStrokeWidth !== "function"
      ? null
      : d3.map(links, linkStrokeWidth);
  const L = typeof linkStroke !== "function" ? null : d3.map(links, linkStroke);

  console.log("NODES", N);
  console.log("LINKS", LS);
  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_: any, i: string | number) => ({ id: N[i] }));
  links = d3.map(links, (_: any, i: string | number) => ({
    source: LS[i],
    target: LT[i]
  }));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the scales.
  const color = nodeGroup == null ? null : d3.scaleOrdinal(nodeGroups, colors);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3
    .forceLink(links)
    .id(({ index: i }: { index: number }) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink)
    .force("charge", forceNode)
    .force("center", d3.forceCenter())
    .on("tick", ticked);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  const link = svg
    .append("g")
    .attr("stroke", typeof linkStroke !== "function" ? linkStroke : null)
    .attr("stroke-opacity", linkStrokeOpacity)
    .attr(
      "stroke-width",
      typeof linkStrokeWidth !== "function" ? linkStrokeWidth : null
    )
    .attr("stroke-linecap", linkStrokeLinecap)
    .selectAll("line")
    .data(links)
    .join("line");

  const node = svg
    .append("g")
    .attr("fill", nodeFill)
    .attr("stroke", nodeStroke)
    .attr("stroke-opacity", nodeStrokeOpacity)
    .attr("stroke-width", nodeStrokeWidth)
    .selectAll("g")
    .data(nodes)
    .join("circle")
    .attr("r", nodeRadius)
    .call(drag(simulation));


  if (W) link.attr("stroke-width", ({ index: i }: { index: number }) => W[i]);
  if (L) link.attr("stroke", ({ index: i }: { index: number }) => L[i]);
  if (G) node.attr("fill", ({ index: i }: { index: number }) => color(G[i]));
  if (T) node.append("title").text(({ index: i }: { index: number }) => T[i]);
  // if (invalidation != null) invalidation.then(() => simulation.stop());

  function intern(value: { valueOf: () => any } | null) {
    return value !== null && typeof value === "object"
      ? value.valueOf()
      : value;
  }

  function ticked() {
    link
      .attr("x1", (d: { source: { x: any } }) => d.source.x)
      .attr("y1", (d: { source: { y: any } }) => d.source.y)
      .attr("x2", (d: { target: { x: any } }) => d.target.x)
      .attr("y2", (d: { target: { y: any } }) => d.target.y);

    node.attr("cx", (d: { x: any }) => d.x).attr("cy", (d: { y: any }) => d.y);
  }

  function drag(simulation: {
    alphaTarget: (arg0: number) => {
      (): any;
      new (): any;
      restart: { (): void; new (): any };
    };
  }) {
    function dragstarted(event: {
      active: any;
      subject: { fx: any; x: any; fy: any; y: any };
    }) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: { subject: { fx: any; fy: any }; x: any; y: any }) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: {
      active: any;
      subject: { fx: null; fy: null };
    }) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return d3
      .drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  return Object.assign(svg.node(), { scales: { color } });
}

defineExpose({ reload });
</script>
