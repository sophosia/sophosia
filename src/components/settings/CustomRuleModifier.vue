<template>
  <q-card
    flat
    class="q-my-md card"
  >
    <q-card-section>
      <div class="row">
        <div class="text-h6">
          {{
            ruleType === "citeKey"
              ? $t("citation-key")
              : ruleType === "pdfRename"
              ? $t("rename", { type: "PDF" })
              : `${$t("project")} ID`
          }}
        </div>
        <q-btn
          class="btn q-ml-sm"
          no-caps
          :ripple="false"
          :label="
            $t('update', {
              type:
                ruleType === 'citeKey'
                  ? $t('citation-key')
                  : ruleType === 'pdfRename'
                  ? $t('rename', { type: 'PDF' })
                  : `${$t('project')} ID`,
            })
          "
          @click="$emit('bulkUpdate')"
        ></q-btn>
      </div>
    </q-card-section>
    <q-card-section class="q-pt-none">
      <div>
        <div>{{ $t("custom-citekey-rule") }}</div>
        <div>{{ citeKeyKeywords.join(", ") }}</div>
      </div>
      <div class="text-bold q-mt-sm">{{ $t("preview") }}</div>
      <div
        v-for="(meta, index) in exampleMetas"
        :key="index"
      >
        <div class="row">
          <div class="q-pr-xs">{{ $t("project") }}:</div>
          <div v-html="projectString"></div>
        </div>
        <div>
          {{
            ruleType === "citeKey"
              ? $t("citation-key")
              : ruleType === "pdfRename"
              ? $t("file")
              : `${$t("project")} ID`
          }}:
          {{ generateCiteKey(meta, rule) }}
        </div>
      </div>

      <q-input
        outlined
        dense
        v-model="customRule"
        :error-message="$t('contains-invalid-keywords-or-connectors')"
        :error="!isRuleValid"
      />
    </q-card-section>
  </q-card>
</template>
<script setup lang="ts">
import { Meta } from "src/backend/database";
import {
  citeKeyKeywords,
  formatMetaData,
  generateCiteKey,
} from "src/backend/project/meta";
import { onMounted } from "vue";
import { PropType, computed, ref } from "vue";

const props = defineProps({
  ruleType: {
    type: String as PropType<"citeKey" | "pdfRename" | "projectId">,
    required: true,
  },
});
const emit = defineEmits(["bulkUpdate"]);
const rule = defineModel<string>("rule", { required: true });
const isRuleValid = ref(true);
const customRule = computed({
  get() {
    return rule.value;
  },
  set(value) {
    const keywordsGroup = citeKeyKeywords.join("|");
    const pattern = new RegExp(`^(${keywordsGroup})(_(${keywordsGroup}))*$`);
    isRuleValid.value = pattern.test(value);
    if (isRuleValid.value) rule.value = value;
  },
});

const exampleMetas = [
  {
    title: "A Long Title",
    author: [
      { family: "Last1", given: "First1" },
      { family: "Last2", given: "First2" },
      { family: "Last3", given: "First3" },
    ],
    issued: { "date-parts": [[2023]] },
    "container-title": "Physics of Plasmas",
    publisher: "AIP Publishing",
  },
] as Meta[];
const projectString = ref<string>("");
onMounted(async () => {
  projectString.value = (await formatMetaData(exampleMetas, "bibliography", {
    format: "html",
    template: "apa",
  })) as string;
});
</script>
