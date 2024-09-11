<template>
  <q-dialog
    v-model="showModal"
    persistent
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card style="width: 300px; max-width: 50vw">
      <q-card-section>
        <div class="text-h8 text-center">{{ $t("settings") }}</div>
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
              {{ state.theme }} ({{ state.type }})
            </q-item-section>
            <q-item-section side>
              <q-btn
                icon="close"
                flat
                dense
                @click.stop="removeChatState(state._id)"
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
          @click="addChatState"
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
import { getAllFolders } from "src/backend/project/folder";

import type { ChatState } from "src/backend/database";
import { ChatType, Folder, Project } from "src/backend/database";
import { getAllProjects } from "src/backend/project/project";
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
    const allFolders = ref<Folder[]>([]);
    const allPapers = ref<Project[]>([]);

    onMounted(async () => {
      const folders = await getAllFolders();
      if (folders) {
        allFolders.value = folders;
      }
      const papers = await getAllProjects();
      if (papers) {
        allPapers.value = papers;
      }
    });

    const updateSuggestions = () => {
      if (newChatState.value.type === ChatType.CATEGORY) {
        filteredSuggestions.value = allFolders.value
          .filter((folder) =>
            folder.label
              .toLowerCase()
              .includes(newChatState.value.theme.toLowerCase())
          )
          .map((folder) => folder.label);
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

    const addChatState = () => {
      let selectedItem;
      if (newChatState.value.type === ChatType.CATEGORY) {
        selectedItem = allFolders.value.find(
          (folder) => folder.label === newChatState.value.theme
        );
      } else if (newChatState.value.type === ChatType.REFERENCE) {
        selectedItem = allPapers.value.find(
          (reference) => reference.label === newChatState.value.theme
        );
      }
      if (!selectedItem) {
        return;
      }
      const new_state = {
        _id: selectedItem._id,
        theme: newChatState.value.theme,
        type: newChatState.value.type,
      } as ChatState;
      chatStore.addChatState(new_state);
      newChatState.value = { _id: "", theme: "", type: ChatType.CATEGORY };
      chatStore.hideModal();

    };

    const hideModal = () => {
      chatStore.hideModal();
    };

    const removeChatState = (_id: string) => {
      chatStore.removeChatState(_id);
    };

    return {
      showModal: computed(() => chatStore.showModal),
      chatStates: computed(() => chatStore.chatStates),
      newChatState,
      filteredSuggestions,
      selectChatState,
      addChatState,
      hideModal,
      removeChatState,
      updateSuggestions,
      selectSuggestion,
    };
  },
};
</script>
