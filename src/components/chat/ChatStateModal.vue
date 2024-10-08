<template>
  <q-dialog
    v-model="showModal"
    persistent
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card style="width: 400px; max-width: 50vw">
      <q-card-section>
        <div class="text-h8 text-center">{{ $t("discussions") }}</div>
      </q-card-section>

      <q-card-section style="overflow-y: auto; max-height: 200px">
        <q-list dense>
          <q-item
            v-for="state in chatStates"
            :key="state._id"
            clickable
            v-ripple
            @click="selectChatState(state as ChatState)"
            style="justify-content: center"
          >
            <q-item-section>
              <div style="width: 100%; word-wrap: break-word">
                {{ state.theme }} ({{ state.type }})
              </div>
            </q-item-section>
            <q-item-section side>
              <q-btn
                icon="close"
                flat
                dense
                @click.stop="removeState(state._id)"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-section>
        <q-form>
          <q-select
            v-model="newChatState.type"
            :options="[
              {
                value: 'reference',
                label: $t('reference'),
              },
              {
                value: 'category',
                label: $t('category'),
              },
            ]"
            :label="$t('type')"
            emit-value
            map-options
            @update:model-value="updateSuggestions"
          />
          <q-input
            v-model="newChatState.theme"
            :label="$t('theme')"
            @update:model-value="updateSuggestions"
          >
            <template v-slot:append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-list dense>
            <q-item
              v-for="suggestion in filteredSuggestions"
              :key="suggestion"
              clickable
              v-ripple
              @click="selectSuggestion(suggestion)"
            >
              <q-item-section>
                {{ suggestion }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-form>
      </q-card-section>

      <q-card-actions align="around">
        <q-btn
          flat
          :label="$t('add')"
          color="primary"
          @click="addState"
        />
        <q-btn
          flat
          :label="$t('cancel')"
          color="primary"
          @click="hideModal"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { getCategories } from "src/backend/category";

import {
  checkIfUploaded,
  uploadPDF,
} from "src/backend/conversationAgent/uploadPDF";
import type { ChatState } from "src/backend/database";
import { ChatType, Project } from "src/backend/database";
import { getAllProjects, getProject, getProjects } from "src/backend/project";
import { useChatStore } from "src/stores/chatStore";
import { computed, onMounted, ref } from "vue";

export default {
  setup() {
    const chatStore = useChatStore();
    const newChatState = ref<ChatState>({
      _id: "",
      theme: "",
      type: ChatType.CATEGORY,
    });
    const filteredSuggestions = ref<string[]>([]);
    const allCategories = ref<string[]>([]);
    const allPapers = ref<Project[]>([]);

    onMounted(async () => {
      const categories = await getCategories();
      if (categories) {
        allCategories.value = categories;
      }
      const papers = await getAllProjects();
      if (papers) {
        allPapers.value = papers;
      }
    });
    /**
     * Update suggestions(names) in the dropdown based on the current input
     */
    const updateSuggestions = () => {
      if (newChatState.value.type === ChatType.CATEGORY) {
        filteredSuggestions.value = allCategories.value.filter((category) =>
          category
            .toLowerCase()
            .includes(newChatState.value.theme.toLowerCase())
        );
      } else if (newChatState.value.type === ChatType.REFERENCE) {
        filteredSuggestions.value = allPapers.value
          .filter((reference) =>
            reference.label
              .toLowerCase()
              .includes(newChatState.value.theme.toLowerCase())
          )
          .map((reference) => reference.label);
      }
    };

    const selectSuggestion = (suggestion: string) => {
      newChatState.value.theme = suggestion;
      filteredSuggestions.value = [];
    };

    const selectChatState = (state: ChatState) => {
      chatStore.setCurrentChatState(state);
      chatStore.hideModal();
    };

    const addState = async () => {
      let selectedItemId: string | undefined;
      const { type, theme } = newChatState.value;

      // Select item based on type
      if (type === ChatType.CATEGORY) {
        selectedItemId = allCategories.value.find(
          (category) => category === theme
        );
      } else if (type === ChatType.REFERENCE) {
        selectedItemId = allPapers.value.find(
          (reference) => reference.label === theme
        )?._id;
      }

      if (!selectedItemId) return;

      // Check if already uploaded
      console.log("selectedItemId", selectedItemId);
      console.log("type", type);

      const isUploaded = await checkIfUploaded(
        selectedItemId,
        type.toLowerCase()
      );
      console.log("isUploaded", isUploaded);
      if (!isUploaded.status) {
        if (type === ChatType.CATEGORY) {
          const projects = await getProjects(selectedItemId);
          if (projects) {
            for (const project of projects) {
              const check = await uploadPDF(project._id);
              if (!check.status) {
                console.error(
                  "Error uploading project",
                  project._id,
                  project.label
                );
                return;
              }
            }
          }
        } else if (type === ChatType.REFERENCE) {
          const project = await getProject(selectedItemId);
          if (project) {
            const check = await uploadPDF(project._id);
            if (!check.status) {
              console.error(
                "Error uploading project",
                project._id,
                project.label
              );
              return;
            }
          }
        }
      }

      // Add new chat state
      const newState = {
        _id: selectedItemId,
        theme: theme,
        type: type,
      } as ChatState;

      await chatStore.addChatState(newState);
      newChatState.value = { _id: "", theme: "", type: ChatType.CATEGORY };
      chatStore.hideModal();
    };
    const hideModal = () => {
      chatStore.hideModal();
    };

    const removeState = (_id: string) => {
      chatStore.removeChatState(_id);
    };

    return {
      showModal: computed(() => chatStore.showModal),
      chatStates: computed(() => chatStore.chatStates),
      newChatState,
      filteredSuggestions,
      selectChatState,
      addState,
      hideModal,
      removeState,
      updateSuggestions,
      selectSuggestion,
    };
  },
};
</script>
