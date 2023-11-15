<template>
  <q-card
    ref="card"
    class="hoverPane"
  >
    <q-card-section v-if="content">
      <div ref="mdContentDiv"></div>
    </q-card-section>
  </q-card>
</template>
<script setup lang="ts">
import Vditor from "vditor/dist/method.min";
import { onMounted, PropType, ref, watchEffect } from "vue";
import { useStateStore } from "src/stores/appState";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { sep } from "@tauri-apps/api/path";
import { db } from "src/backend/database";
const stateStore = useStateStore();

const props = defineProps({
  content: { type: String },
  data: {
    type: Object as PropType<{ content: string }>,
    required: true,
  },
});
const emit = defineEmits(["clickLink"]);
const card = ref();
const mdContentDiv = ref();

watchEffect(() => {
  if (props.data.content && mdContentDiv.value)
    Vditor.preview(mdContentDiv.value, props.data.content, {
      theme: stateStore.settings.theme === "dark" ? "dark" : "classic",
      mode: stateStore.settings.theme,
      hljs: {
        lineNumber: true,
        style: stateStore.settings.theme === "dark" ? "native" : "emacs",
      },
      after: changeLinks,
    });
});

onMounted(async () => {
  if (!card.value) return;
  card.value.$el.onmouseenter = () => {
    card.value.$el.onmouseleave = () => {
      card.value.$el.hidden = true;
    };
  };
});

function changeLinks() {
  if (!mdContentDiv.value) return;

  let linkNodes = mdContentDiv.value.querySelectorAll(
    "a"
  ) as NodeListOf<HTMLAnchorElement>;
  for (let linkNode of linkNodes) {
    linkNode.onclick = (e: MouseEvent) => {
      // do not open link winthin app
      e.preventDefault();
      let link = linkNode.href
        .replace("http://localhost:9000/", "") // in dev mode
        .replace("tauri://localhost/", ""); // in production mode
      emit("clickLink", e, link);
    };
  }

  let imageNodes = mdContentDiv.value.querySelectorAll(
    "img"
  ) as NodeListOf<HTMLImageElement>;
  for (const img of imageNodes) {
    if (
      !img.src.includes("http://localhost:9000/") &&
      !img.src.includes("tauri://localhost/")
    )
      continue;
    const imgFile = img.src
      .replace("http://localhost:9000/", "") // in dev mode
      .replace("tauri://localhost/", ""); // in production mode
    img.src = convertFileSrc(
      [db.storagePath, ".sophosia", "image", imgFile].join(sep)
    );
  }
}

defineExpose({ card });
</script>
<style lang="scss">
.hoverPane {
  position: absolute;
  width: 40%;
  max-height: 30%;
  overflow: auto;
}
</style>
