<template>
  <div ref="root"></div>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import pluginManager from "src/backend/plugin";
import { ComponentName, View } from "src/backend/database";
import { PageData } from "src/backend/database";
import { PropType } from "vue";
const props = defineProps({
  id: { type: String, required: true },
  visible: { type: Boolean, reqruied: true },
  data: { type: Object as PropType<PageData>, required: true },
});

const root = ref<HTMLDivElement | null>(null);
const views = ref<View[]>([]);
views.value = pluginManager.getViews(ComponentName.PLUGIN_PAGE);
onMounted(() => {
  console.log(views.value);
  for (let view of views.value) {
    if (view.uid === props.data._id) {
      if (root.value && view.onMounted) view.onMounted(root.value);
    }
  }
});
</script>
