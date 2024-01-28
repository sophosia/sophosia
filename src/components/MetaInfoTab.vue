<template>
  <!-- show this after rightMenu is shown,
    otherwise autogrow extends to full-height -->
  <q-tabs
    v-if="!!meta && !!meta.reference && meta.reference.length > 0"
    v-model="tab"
    dense
    no-caps
  >
    <q-tab name="meta">{{ $t("info") }}</q-tab>
    <q-tab name="reference">{{ $t("reference") }}</q-tab>
  </q-tabs>
  <q-tab-panels
    v-if="!!meta"
    v-model="tab"
  >
    <q-tab-panel
      name="meta"
      class="tab-panel"
    >
      <div class="row justify-between">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("type") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model="meta.type"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("citation-key") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model="meta['citation-key']"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("title") }}
        </div>
      </div>
      <div class="row q-mt-sm">
        <textarea
          style="min-height: 5rem"
          class="col input"
          type="text"
          v-model="title"
          @blur="modifyInfo()"
          data-cy="title"
        ></textarea>
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("year") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model="year"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("journal") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model="meta['container-title']"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("publisher") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model="meta.publisher"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("author") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          :placeholder="$t('first-last-last-first')"
          v-model.trim="name"
          @keydown.enter="addAuthor"
          data-cy="author-input"
        />
      </div>

      <div class="row q-mt-sm">
        <q-chip
          v-for="(author, index) in authors"
          :key="index"
          dense
          size="1rem"
          class="chip col-12"
          :ripple="false"
          :label="author"
          removable
          clickable
          @remove="removeAuthor(index)"
          @click="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(author);
            }
          "
          :data-cy="`q-chip-${index}`"
        >
        </q-chip>
      </div>

      <div
        class="col q-mt-sm"
        style="font-size: 1rem"
      >
        {{ $t("abstract") }}
      </div>
      <div class="row">
        <textarea
          style="min-height: 10rem"
          class="col input"
          v-model="meta.abstract"
          @blur="modifyInfo()"
        ></textarea>
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          DOI
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model.trim="meta.DOI"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          ISBN
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model.trim="meta.ISBN"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          URL
          <q-btn
            flat
            padding="none"
            size="md"
            icon="mdi-open-in-new"
            :disable="!!!meta.URL"
            @click="openURL(meta?.URL)"
          >
            <q-tooltip>
              <i18n-t keypath="open">
                <template #type>{{ $t("link") }}</template>
              </i18n-t>
            </q-tooltip>
          </q-btn>
        </div>
        <input
          class="col-8 input"
          type="url"
          placeholder="https://..."
          v-model.trim="meta.URL"
          @blur="modifyInfo()"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("file") }}
          <q-btn
            flat
            padding="none"
            size="md"
            icon="mdi-open-in-new"
            :disable="!meta.path"
            @click="
              async () => {
                await invoke('show_in_folder', {
                  path: meta!.path as string
                });
              }
            "
          >
            <q-tooltip> {{ $t("show-in-explorer") }}</q-tooltip>
          </q-btn>
        </div>
        <q-chip
          dense
          style="max-width: 65%"
          size="1rem"
          class="chip"
          :ripple="false"
          clickable
          @click="stateStore.openItem(meta?._id)"
        >
          <q-icon name="img:icons/pdf.png"></q-icon>
          <span class="q-ml-xs ellipsis">{{ file }}</span>
        </q-chip>
      </div>

      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("tags") }}
        </div>
        <input
          class="col-8 input"
          type="text"
          v-model.trim="tag"
          @keydown.enter="addTag"
        />
      </div>
      <div class="q-pb-sm">
        <q-chip
          v-for="(tag, index) in meta.tags"
          :key="index"
          class="chip"
          :ripple="false"
          :label="tag"
          dense
          clickable
          size="1rem"
          icon="mdi-tag"
          removable
          @remove="removeTag(tag)"
          @click="
            () => {
              $q.notify($t('text-copied'));
              copyToClipboard(tag);
            }
          "
        />
      </div>
      <div class="row justify-between q-mt-sm">
        <div
          class="col"
          style="font-size: 1rem"
        >
          {{ $t("category") }}
        </div>
      </div>
      <div class="q-pb-sm">
        <q-chip
          v-for="(name, index) in categories"
          class="chip"
          :key="index"
          :ripple="false"
          dense
          size="1rem"
          icon="mdi-folder"
          :label="name"
        />
      </div>

      <div class="row justify-between q-mt-sm">
        <div style="font-size: 1rem">
          {{ $t("date-added") }}
        </div>
        <div>{{ new Date(meta.timestampAdded).toLocaleString() }}</div>
      </div>

      <div class="row justify-between q-mt-sm">
        <div style="font-size: 1rem">
          {{ $t("date-modified") }}
        </div>
        <div>{{ new Date(meta.timestampModified).toLocaleString() }}</div>
      </div>

      <div>
        <q-btn
          class="buttons full-width"
          square
          :label="$t('update-meta')"
          no-caps
          :disable="!meta.URL && !meta.ISBN && !meta.DOI"
          @click="updateMeta"
        >
        </q-btn>
        <q-tooltip
          v-if="!(meta.URL || meta.ISBN || meta.DOI)"
          anchor="bottom middle"
          self="top middle"
        >
          {{ $t("update-meta-requirement") }}
        </q-tooltip>
      </div>
    </q-tab-panel>

    <q-tab-panel
      name="reference"
      class="tab-panel"
    >
      <div
        v-for="(ref, ind) of references"
        :key="ind"
        class="q-pb-sm"
      >
        <div v-html="`${ind + 1}. ${ref.text}`"></div>
        <div
          v-if="!!ref.link"
          class="link"
          :href="ref.link"
          @click="openURL(ref.link)"
        >
          {{ ref.link }}
        </div>
      </div>
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
// types
import { Author, Folder, Meta, Page, Project } from "src/backend/database";
import type { PropType } from "vue";
import { computed, ref, watch, watchEffect } from "vue";
// backend stuff
import { invoke } from "@tauri-apps/api";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/api/shell";
import { copyToClipboard } from "quasar";
import { getFolder } from "src/backend/project/folder";
import { generateCiteKey, getMeta } from "src/backend/project/meta";
import { useLayoutStore } from "src/stores/layoutStore";
import { useProjectStore } from "src/stores/projectStore";
import { useStateStore } from "src/stores/stateStore";
const projectStore = useProjectStore();
const stateStore = useStateStore();
const layoutStore = useLayoutStore();

const props = defineProps({ project: Object as PropType<Project> });
const tab = ref("meta");
const name = ref(""); // author name
const tag = ref(""); // project tag
const categories = ref<string[]>([]);
const references = ref<{ text: string; link: string }[]>([]);

const meta = computed(() => props.project);
const title = computed({
  get() {
    return meta.value?.title || "";
  },
  set(newTitle: string) {
    if (!meta.value) return;
    meta.value.title = newTitle;
    meta.value.label = newTitle;
  }
});
const year = computed({
  get() {
    if (!meta.value?.issued) return "";
    return meta.value.issued["date-parts"][0][0];
  },
  set(newYear: string) {
    if (!meta.value) return;
    if (!meta.value.issued) {
      meta.value.issued = {
        "date-parts": [[1, 1]] // initialize it
      };
    }
    meta.value.issued["date-parts"][0][0] = parseInt(newYear);
  }
});
const authors = computed(() => {
  let authors = meta.value?.author;
  if (!!!authors?.length) return "";

  let names = [];
  for (let author of authors) {
    if (!!!author) continue;
    if (!!author.literal) names.push(author.literal);
    else names.push(`${author.given} ${author.family}`);
  }
  return names;
});
// pdf file
const file = ref(""); // pdf file name
watchEffect(async () => {
  try {
    file.value = await basename(props.project?.path as string);
  } catch (error) {
    file.value = "";
  }
});

watch(tab, () => {
  if (tab.value === "reference") getReferences();
});

watchEffect(async () => {
  // get parentFolder labels of a projects
  let ids = props.project?.folderIds;
  if (!ids) return;
  categories.value = [];
  for (let id of ids) {
    let folder = (await getFolder(id)) as Folder | undefined;
    if (folder) categories.value.push(folder.label);
  }
});

/**********************************************
 * Methods
 **********************************************/
/**
 * Modifies the project information based on user input.
 * Updates the citation key using the current citation key rule.
 * Reflects changes in the project store and layout store.
 */
async function modifyInfo() {
  if (meta.value === undefined) return;
  meta.value["citation-key"] = generateCiteKey(
    meta.value,
    stateStore.settings.citeKeyRule
  );
  projectStore.updateProject(meta.value._id, meta.value);
  layoutStore.renamePage(meta.value._id, {
    id: meta.value._id,
    label: meta.value.label
  } as Page);
}

/**
 * Adds an author to the project metadata.
 * Processes and splits the input string into given and family names.
 * Updates the project information after adding the author.
 */
async function addAuthor() {
  if (meta.value === undefined) {
    name.value = "";
    return;
  }
  if (name.value.trim() === "") return;

  // update ui
  let author = {} as Author;
  if (name.value.includes(",")) {
    [author.family, author.given] = name.value
      .split(",")
      .map((item) => item.trim());
  } else {
    let truncks = name.value.split(" ");
    if (truncks.length === 1) {
      author.literal = name.value;
    } else {
      author.family = truncks.pop();
      author.given = truncks.join(" ");
    }
  }
  if (!meta.value.author) meta.value.author = [] as Author[];
  meta.value.author.push(author);
  name.value = "";

  // update db
  modifyInfo();
}

/**
 * Removes an author from the project metadata at a specified index.
 * Updates the project information after removal.
 */
async function removeAuthor(index: number) {
  if (meta.value === undefined) return;
  if (!meta.value.author) return;

  // update ui
  meta.value.author.splice(index, 1);

  // update db
  modifyInfo();
}
/**
 * Adds a tag to the project metadata.
 * Updates the project information after adding the tag.
 */
async function addTag() {
  if (meta.value === undefined) return;

  // update ui
  meta.value.tags.push(tag.value);
  tag.value = ""; // remove text in input

  // update db
  modifyInfo();
}

/**
 * Removes a specific tag from the project metadata.
 * Updates the project information after removing the tag.
 */
async function removeTag(tag: string) {
  if (meta.value === undefined) return;

  // update ui
  meta.value.tags = meta.value.tags.filter((t) => t != tag);

  // update db
  modifyInfo();
}

/**
 * Retrieves and sets references for the project.
 * Formats the references for display in the UI.
 */
async function getReferences() {
  if (!!!meta.value?.reference || meta.value.reference.length === 0) return;

  for (let i in meta.value.reference) {
    references.value.push({ text: "", link: "" });
  }

  for (let [i, ref] of meta.value.reference.entries()) {
    try {
      getMeta([ref.DOI || ref.key], "bibliography", {
        format: "html"
      }).then((text: string | Meta[]) => {
        if (text === null) return;
        let match = (text as string).match(/(https[a-zA-Z0-9:\.\/\-\_]+)/g);
        references.value[i].link = match ? match[0] : "";
        references.value[i].text = (text as string).replace(
          /(https[a-zA-Z0-9:\.\/\-\_]+)/g,
          ""
        );
      });
    } catch (error) {
      let author = !!ref.author ? ref.author + " " : "";
      let year = !!ref.year ? `(${ref.year}) ` : "";
      let title =
        ref["article-title"] || ref["series-title"] || ref.unstructured;
      references.value[i].text = `<div>${author + year + title}</div>`;
      if (ref.DOI || ref.key)
        references.value[i].link = "https://doi.org/" + (ref.DOI || ref.key);
    }
  }
}

/**
 * Updates the project metadata using an external source (DOI, ISBN, URL).
 * Retrieves updated metadata and applies it to the project.
 */
async function updateMeta() {
  let metas: Meta[];
  let identifier: string;
  if (meta.value?.DOI) {
    identifier = meta.value.DOI;
  } else if (meta.value?.ISBN) {
    identifier = meta.value.ISBN;
  } else {
    identifier = meta.value?.URL as string;
  }
  metas = (await getMeta([identifier])) as Meta[];
  Object.assign(meta.value as Project, metas[0]);
  modifyInfo();
}

/**
 * Opens a specified URL in the default web browser.
 * @param url - The URL to be opened.
 */
function openURL(url: string | undefined) {
  if (url === undefined || url === "") return;
  open(url);
}
</script>
