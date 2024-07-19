<template>
  <q-tabs
    v-model="rightMenuTab"
    dense
    align="justify"
    class="right-menu-tabs"
    indicator-color="transparent"
  >
    <q-tab
      name="metaInfoTab"
      icon="mdi-information-outline"
      :ripple="false"
      data-cy="tab-meta-info"
    >
      <q-tooltip>{{ $t("info") }}</q-tooltip>
    </q-tab>
    <q-tab
      name="tocTab"
      icon="mdi-table-of-contents"
      :ripple="false"
      data-cy="tab-toc"
    >
      <q-tooltip>{{ $t("toc") }}</q-tooltip>
    </q-tab>
    <q-tab
      name="annotationTab"
      icon="mdi-comment-edit-outline"
      :ripple="false"
      data-cy="tab-annot-list"
    >
      <q-tooltip>{{ $t("comment") }}</q-tooltip>
    </q-tab>
  </q-tabs>
  <!-- q-tab height: 36px -->
  <q-tab-panels
    class="right-menu-panel"
    v-model="rightMenuTab"
  >
    <q-tab-panel name="metaInfoTab">
      <MetaInfoTab v-model:project="project" />
    </q-tab-panel>

    <q-tab-panel name="tocTab">
      <PDFTOC
        :outline="pdfApp.outline"
        @clickTOC="(node: TOCNode) => pdfApp.clickTOC(node)"
      />
    </q-tab-panel>

    <q-tab-panel name="annotationTab">
      <AnnotList
        :annots="(pdfApp.annotStore.annots as Annotation[])"
        :selectedId="pdfApp.annotStore.selectedId"
        @setActive="(id) => pdfApp.annotStore.setActive(id)"
      />
    </q-tab-panel>
  </q-tab-panels>
</template>

<script setup lang="ts">
import { inject, Ref, ref } from "vue";
import { Project, TOCNode } from "src/backend/database";
import { KEY_pdfApp, KEY_project } from "./injectKeys";
import PDFApplication from "src/backend/pdfreader";
import { Annotation } from "src/backend/pdfannotation/annotations";

import MetaInfoTab from "../MetaInfoTab.vue";
import PDFTOC from "./PDFTOC.vue";
import AnnotList from "./AnnotList.vue";

const rightMenuTab = ref("metaInfoTab");

const pdfApp = inject(KEY_pdfApp) as PDFApplication;
const project = inject(KEY_project) as Ref<Project>;
</script>
