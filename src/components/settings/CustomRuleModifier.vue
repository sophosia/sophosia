<template>
  <div class="rule-section">
    <div class="rule-header">
      <span class="rule-title">
        {{
          ruleType === "citeKey"
            ? $t("citation-key")
            : ruleType === "pdfRename"
            ? $t("rename", { type: "PDF" })
            : `${$t("project")} ID`
        }}
      </span>
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
      />
    </div>
    <div class="rule-body">
      <div class="rule-info">
        <div>{{ $t("custom-citekey-rule") }}</div>
        <div class="rule-keywords">{{ citeKeyKeywords.join(", ") }}</div>
      </div>
      <div class="rule-preview-label">{{ $t("preview") }}</div>
      <div
        v-for="(meta, index) in exampleMetas"
        :key="index"
        class="rule-preview"
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
        class="rule-input"
        outlined
        dense
        v-model="customRule"
        :error-message="$t('contains-invalid-keywords-or-connectors')"
        :error="!isRuleValid"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { Meta } from "src/backend/database";
import {
  citeKeyKeywords,
  formatMetaData,
  generateCiteKey,
} from "src/backend/meta";
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
<style lang="scss" scoped>
.rule-section {
  padding: 16px 0;
  border-bottom: 1px solid var(--q-border);
}

.rule-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.rule-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--q-reg-text);
}

.rule-body {
  font-size: 0.8125rem;
  color: var(--q-text-muted);
}

.rule-keywords {
  font-size: 0.75rem;
  color: var(--q-text-muted);
  margin-top: 2px;
}

.rule-preview-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--q-reg-text);
  margin-top: 8px;
  margin-bottom: 4px;
}

.rule-preview {
  font-size: 0.8125rem;
  color: var(--q-text-muted);
  margin-bottom: 4px;
}

.rule-input {
  max-width: 320px;
  margin-top: 8px;
}
</style>
