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
import { an } from "vitest/dist/reporters-5f784f42";

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
  console.log("Current",props.itemId);
  console.log("elments", elements);

  const chart = ForceGraph(
    { nodes: elements.nodes, links: elements.edges },
    {
      current: props.itemId,
      nodeId: (d: { data: { id: any } }) => d.data.id,
      nodeTitle: (d: { data: { label: any; type: any } }) =>
        `${d.data.label}`,
      nodeGroup: (d: { data: { type: any } }) => {
          if (d.data.type === "project") {
              return 0; // Group 0 for projects
          } else if (d.data.type === "note") {
              return 1; // Group 1 for notes
          } else {
              return 2; // Default group for others, if any
          }
      },
      nodeGroups: [], // Add nodeGroups property
      nodeStrength: 1, // Add nodeStrength property
      linkStrength: 1, // Add linkStrength property
      height: props.height,
      width: props.width,
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
    current, // the currently open project/node id
    nodeId = (d: { data: { id: any } }) => d.data.id, // given d in nodes, returns a unique identifier (string)
    // Remove the duplicate declaration of 'any' type
    nodeGroup, // given d in nodes, returns an (ordinal) value for color
    nodeGroups, // an array of ordinal values representing the node groups
    nodeTitle, // given d in nodes, a title string
    nodeFill = "currentColor", // node stroke fill (if not using a group color encoding)
    nodeStroke = "#fff", // node stroke color
    nodeStrokeWidth = 1.5, // node stroke width, in pixels
    nodeStrokeOpacity = 1, // node stroke opacity
    nodeRadius = 7, // node radius, in pixels
    nodeStrength = 2,
    linkSource = (d: { data: { source: any } }) => d.data.source, // given d in links, returns a node identifier string
    linkTarget = (d: { data: { target: any } }) => d.data.target, // given d in links, returns a node identifier string
    linkStroke = "#999", // link stroke color
    linkStrokeOpacity = 0.6, // link stroke opacity
    linkStrokeWidth = 1, // given d in links, returns a stroke width in pixels
    linkStrokeLinecap = "round", // link stroke linecap
    linkStrength = 3,
    colors = ["#B0B2B8","#455087"], // an array of color strings, for the node groups = last index is the current node
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

  // Replace the input nodes and links with mutable objects for the simulation.
  nodes = d3.map(nodes, (_: any, i: string | number) => ({ id: N[i] ,group: G[i], label:T[i]} ));
  links = d3.map(links, (_: any, i: string | number) => ({
    source: LS[i],
    target: LT[i]
  }));

  // Compute default domains.
  if (G && nodeGroups === undefined) nodeGroups = d3.sort(G);

  // Construct the forces.
  const forceNode = d3.forceManyBody();
  const forceLink = d3
    .forceLink(links)
    .id(({ index: i }: { index: number }) => N[i]);
  if (nodeStrength !== undefined) forceNode.strength(nodeStrength);
  if (linkStrength !== undefined) forceLink.strength(linkStrength);

  const simulation = d3
    .forceSimulation(nodes)
    .force("link", forceLink.distance(100))
    .force("charge", forceNode.strength(-100))
    .force("center", d3.forceCenter())
    .on("tick", ticked);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height])
    .attr("style", "max-width: 100%; height: auto; height: intrinsic;");

  //used for controlling zoom and pan
  const contentGroup = svg.append('g');

  const link = contentGroup
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

  const node = contentGroup
  .append("g")
  .attr("stroke", nodeStroke)
  .attr("stroke-opacity", nodeStrokeOpacity)
  .attr("stroke-width", nodeStrokeWidth)
  .selectAll("g")
  .data(nodes)
  .join("g") // Use 'g' for grouping circle and text
  .call(drag(simulation))
  .style("cursor", "pointer")
  .on("click", function(event: { stopPropagation: () => void; }, d: { id: string; }) {
    event.stopPropagation();
    layoutStore.openItem(d.id as string);
    });

  node.each(function (d: any) {
    console.log("check",d);
    if (d.group === 0) {
        d3.select(this)
            .append("rect") // Add a square for group 0 (project)
            .attr("width", 2 * nodeRadius)
            .attr("height", 2 * nodeRadius)
            .attr("x", -nodeRadius) // Center the square on the node's position
            .attr("y", -nodeRadius);
    } else if (d.group === 1) {
        d3.select(this)
            .append("circle") // Add a circle for group 1 (note)
            .attr("r", nodeRadius);
    } 
});

  node
    .append("text")
    .text((d: { label: any; }) => d.label) // Assuming 'd.id' holds the text you want to display
    .attr("x", 0)
    .attr("dx", "-2em") // Adjust for centering text
    .attr("y", 0)
    .attr("dy", "2em") // Adjust for centering text
    .attr("text-anchor", "bottom") // Center text on the node's position
    .style("fill", "#455087") // Ensure fill color is set to red
    .style("font-size", "0.8em") // Adjust font size as needed
    .style("font-weight", 100);


  if (W) link.attr("stroke-width", ({ index: i }: { index: number }) => W[i]);
  if (L) link.attr("stroke", ({ index: i }: { index: number }) => L[i]);
  if (G) {
  node.attr("fill", (d: any, i: number) => {
    if (d.id === current) {
      return colors[1]; // Use last color in colors for current node
    } else {
      return colors[0]; // Use the original color based on the group
    }
    });
  }
  if (T) node.append("title").text(({ index: i }: { index: number }) => T[i]);
  

  // Add zoom and pan functionality
  const zoomBehavior = d3.zoom()
  .scaleExtent([0.1, 4]) // Example scale extents: min and max zoom
  .on('zoom', (event:any) => {
    contentGroup.attr('transform', event.transform);
  });

  svg.call(zoomBehavior);
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

      node
      .attr("transform", (d: { x: any; y: any; }) => `translate(${d.x},${d.y})`);    
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
  // Use the SVG's dimensions to define the boundaries
  const minX = -(width/2); // Left edge of the SVG
  const maxX = width/2; // Right edge of the SVG, assuming 'width' is defined as the SVG's width
  const minY = -(height/2); // Top edge of the SVG
  const maxY = height/2; // Bottom edge of the SVG, assuming 'height' is defined as the SVG's height

  // Enforce SVG boundaries when dragging nodes
  // Clamp the node's position within the SVG's bounds
  const x = Math.max(minX, Math.min(maxX, event.x));
  const y = Math.max(minY, Math.min(maxY, event.y));

  // Apply the clamped position to the node's fixed position attributes
  event.subject.fx = x;
  event.subject.fy = y;
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

  return Object.assign(svg.node(), { scales: { colors } });
}

defineExpose({ reload });
</script>
