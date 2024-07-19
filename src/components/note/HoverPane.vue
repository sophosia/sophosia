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
        class="contentPane"
      ></div>
    </q-card-section>
  </q-card>
</template>
<script setup lang="ts">
import { sep } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { db } from "src/backend/database";
import { useSettingStore } from "src/stores/settingStore";
import Vditor from "vditor/dist/method.min";
import { onMounted, PropType, ref, watchEffect } from "vue";
const settingStore = useSettingStore();

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
      theme: settingStore.theme === "dark" ? "dark" : "classic",
      mode: settingStore.theme,
      hljs: {
        lineNumber: true,
        style: settingStore.theme === "dark" ? "native" : "emacs",
      },
      after: changeLinks,
      cdn: "vditor",
    });
});

onMounted(async () => {
  if (!card.value) return;
  card.value.$el.onmouseenter = () => {
    supposeToClose.value = false;
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
      [db.config.storagePath, ".sophosia", "image", imgFile].join(sep)
    );
  }
}

defineExpose({ card, close, supposeToClose });
</script>
