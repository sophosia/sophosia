<template>
    <q-dialog v-model="showModal" persistent transition-show="scale" transition-hide="scale">
        <q-card style="width: 300px; max-width: 50vw;">
            <q-card-section>
                <div class="text-h8 text-center">Chat Settings</div>
            </q-card-section>

            <q-card-section style="overflow-y: auto; max-height: 200px;">
                <q-list dense>
                    <q-item v-for="state in chatStates" :key="state._id" clickable v-ripple
                        @click="selectChatState(state as ChatState)" style="justify-content: center;">
                        <q-item-section>
                            {{ state.label }} ({{ state.type }})
                        </q-item-section>
                        <q-item-section side>
                            <q-btn icon="close" flat dense @click.stop="removeChatState(state.label)" />
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>

            <q-card-section>
                <q-form>
                    <q-select v-model="newChatState.type" :options="['paper', 'folder']" label="Type"
                        @update:model-value="updateSuggestions" />
                    <q-input v-model="newChatState.label" label="label" @update:model-value="updateSuggestions">
                        <template v-slot:append>
                            <q-icon name="search" />
                        </template>
                    </q-input>
                    <q-list dense>
                        <q-item v-for="suggestion in filteredSuggestions" :key="suggestion" clickable v-ripple
                            @click="selectSuggestion(suggestion)">
                            <q-item-section>
                                {{ suggestion }}
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-form>
            </q-card-section>

            <q-card-actions align="around">
                <q-btn flat label="Add" color="primary" @click="addChatState" />
                <q-btn flat label="Cancel" color="primary" @click="hideModal" />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script lang="ts">
import { getAllFolders } from 'src/backend/project/folder';

import { useChatStore } from 'src/stores/chatStore';
import { ref, computed, onMounted } from 'vue';
import { Folder, Project } from 'src/backend/database';
import { getAllProjects } from 'src/backend/project/project';

interface ChatState {
    _id: string;
    label: string; //
    type: 'folder' | 'paper';
    
}

export default {
    setup() {
        const chatStore = useChatStore();
        const newChatState = ref({ label: '', type: 'folder' });
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
            if (newChatState.value.type === 'folder') {
                filteredSuggestions.value = allFolders.value
                    .filter(folder => folder.label.toLowerCase().includes(newChatState.value.label.toLowerCase()))
                    .map(folder => folder.label);
            } else if (newChatState.value.type === 'paper') {
                filteredSuggestions.value = allPapers.value
                    .filter(paper => paper.label.toLowerCase().includes(newChatState.value.label.toLowerCase()))
                    .map(paper => paper.label);
            }
        };

        const selectSuggestion = (suggestion: string) => {
            newChatState.value.label = suggestion;
            filteredSuggestions.value = [];
        };

        const selectChatState = (state: ChatState) => {
            chatStore.setCurrentChatState(state);
            chatStore.hideModal();
        };

        const addChatState = () => {
            let selectedItem;
            if (newChatState.value.type === 'folder') {
                selectedItem = allFolders.value.find(folder => folder.label === newChatState.value.label);
            } else if (newChatState.value.type === 'paper') {
                selectedItem = allPapers.value.find(paper => paper.label === newChatState.value.label);
            } 
            if (!selectedItem) {
                return;
            }
            const new_state = {
                _id: selectedItem._id,
                label: newChatState.value.label,
                type: newChatState.value.type,
                
            } as ChatState;
            chatStore.addChatState(new_state);
            newChatState.value = { label: '', type: 'folder' };
            chatStore.hideModal();
        };

        const hideModal = () => {
            chatStore.hideModal();
        };

        const removeChatState = (label: string) => {
            chatStore.removeChatState(label);
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