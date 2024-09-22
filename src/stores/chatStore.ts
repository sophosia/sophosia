import { defineStore } from "pinia";
import { getSupabaseClient } from "src/backend/authSupabase";
import {
  retrieveCategoryid,
  retrieveHistory,
  retrieveReferenceid,
} from "src/backend/conversationAgent";
import {
  AppState,
  ChatMessage,
  ChatState,
  ChatType,
} from "src/backend/database";
import { errorDialog } from "src/components/dialogs/dialogController";
import { ref } from "vue";

export const useChatStore = defineStore("chat", {
  state: () => ({
    initialized: false,
    chatVisibility: false,
    currentChatState: ref<ChatState | null>(null),
    chatStates: ref<ChatState[]>([]),
    chatMessages: ref<{ [key: string]: ChatMessage[] }>({}),
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
      if (!this.chatMessages[newState._id]) {
        this.chatMessages[newState._id] =
          (await this.syncMessages(newState)) || [];
        this.chatStates.push(newState);
      }
    },

    addMessageToChatState(theme: string, message: ChatMessage) {
      if (this.chatMessages[theme]) {
        this.chatMessages[theme].push(message);
      }
    },
    removeChatState(_id: string) {
      const index = this.chatStates.findIndex((state) => state._id === _id);
      if (index !== -1) {
        this.chatStates.splice(index, 1);
      }
      delete this.chatMessages[_id];
    },

    openModal() {
      this.showModal = true;
    },
    hideModal() {
      this.showModal = false;
    },

    async syncMessages(state: ChatState) {
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return;
      }
      try {
        let history;
        if (state.type === ChatType.REFERENCE) {
          const paperid = await retrieveReferenceid(supabase, state.theme);
          history = await retrieveHistory(
            supabase,
            "paper",
            undefined,
            paperid
          );
        } else {
          const folderid = await retrieveCategoryid(supabase, state._id);
          history = await retrieveHistory(
            supabase,
            "folder",
            folderid,
            undefined
          );
        }

        return history || [];
      } catch (error) {
        console.log("Error in syncMessages", error);
      }
    },

    async loadState(state: AppState) {
      if (this.initialized) return;

      this.chatVisibility = state.chatVisibility;
      this.chatStates = state.chatStates;
      this.chatMessages = state.chatMessages;
      this.currentChatState = state.currentChatState;
      this.initialized = true;

      for (const chatState of state.chatStates) {
        this.chatMessages[chatState._id] =
          (await this.syncMessages(chatState)) || [];
      }
    },

    saveState(): AppState {
      return {
        chatVisibility: this.chatVisibility,
        chatStates: this.chatStates,
        chatMessages: this.chatMessages,
        currentChatState: this.currentChatState,
      } as AppState;
    },
  },
});
