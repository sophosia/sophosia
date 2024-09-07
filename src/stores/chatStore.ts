import { ref } from 'vue';
import { defineStore } from 'pinia';

interface ChatState {
    _id: string;
    label: string;
    type: 'folder' | 'paper';

}

export const useChatStore = defineStore('chat', {
  state: () => ({
    chatVisibility: false,
    currentChatState: ref<ChatState | null>(null),
    chatStates: ref<ChatState[]>([]),
    showModal: false,

  }),
  actions: {
    toggleChatVisibility() {
      this.chatVisibility = !this.chatVisibility;
    },
    showChat() {
      this.chatVisibility = true;
    },
    hideChat() {
      this.chatVisibility = false;
    },
    setCurrentChatState(state: ChatState) {
      this.currentChatState = state;
      this.showChat();
    },
    async addChatState(newState: ChatState) {

        this.chatStates.push(newState);



    },
    removeChatState(label: string) {
      const index = this.chatStates.findIndex((state) => state.label === label);
      if (index !== -1) {
        this.chatStates.splice(index, 1);
      }
    },
    openModal() {
      this.showModal = true;
    },
    hideModal() {
      this.showModal = false;
    },
  },
});