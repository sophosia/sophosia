<template>
  <q-card
    ref="card"
    class="hoverPane"
  >
    <q-card-section
      v-if="content"
      class="q-pa-xs"
    >
      <div
        ref="mdContentDiv"
        style="background-color: var(--color-hoverpane-bkgd)"
      ></div>
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
const supposeToClose = ref(true);

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
      cdn: "vditor",
    });
});

onMounted(async () => {
  if (!card.value) return;
  card.value.$el.onmouseenter = () => {
    supposeToClose.value = false;
    console.log("supposeToclose", supposeToClose.value);
  };
  card.value.$el.onmouseleave = close;
});

function close() {
  supposeToClose.value = true;
  setTimeout(() => {
    if (supposeToClose.value) card.value.$el.hidden = true;
  }, 200);
}

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
        .replace("tauri://localhost/", "") // in production mode, mac, linux
        .replace("https://tauri.localhost/", ""); // in production mode, windows
      emit("clickLink", e, link);
    };
  }

  let imageNodes = mdContentDiv.value.querySelectorAll(
    "img"
  ) as NodeListOf<HTMLImageElement>;
  for (const img of imageNodes) {
    if (
      !img.src.includes("http://localhost:9000/") &&
      !img.src.includes("tauri://localhost/") &&
      !img.src.includes("https://tauri.localhost/")
    )
      continue;
    const imgFile = img.src
      .replace("http://localhost:9000/", "") // in dev mode
      .replace("tauri://localhost/", "") // in production mode, mac, linux
      .replace("https://tauri.localhost/", ""); // in production mode, windows
    img.src = convertFileSrc(
      [db.storagePath, ".sophosia", "image", imgFile].join(sep)
    );
  }
}

defineExpose({ card, close, supposeToClose });
</script>
<style lang="scss">
.hoverPane {
  position: absolute;
  width: 40%;
  height: 50%;
  overflow: auto;
  border: 2px solid var(--color-hoverpane-border);
  background-color: var(--color-hoverpane-bkgd);
}
</style>
