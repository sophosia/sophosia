<template>
  <OpenBook
    v-if="node.dataType === 'project'"
    :width="size"
    :height="size"
    class="q-mr-xs"
  />
  <Folder
    v-else-if="node.dataType === 'folder'"
    :width="size"
    :height="size"
    class="q-mr-xs"
  />
  <PageIcon
    v-else-if="node.dataType === 'paper'"
    :width="size"
    :height="size"
    class="q-mr-xs"
  />
  <DesignPencil
    v-else-if="node.dataType === 'note' && node.type === NodeType.EXCALIDRAW"
    :width="size"
    :height="size"
    class="q-mr-xs"
  />
  <PageIcon
    v-else
    :width="size"
    :height="size"
    class="q-mr-xs"
  />
</template>
<script setup lang="ts">
import { ProjectNode, NodeType, Project } from "src/backend/database";
import {
  OpenBook,
  Folder,
  DesignPencil,
  Page as PageIcon,
} from "@iconoir/vue";

withDefaults(
  defineProps<{
    node: Project | ProjectNode;
    size?: number;
  }>(),
  { size: 16 }
);
</script>
