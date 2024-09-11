<template>
  <q-card class="chat-window">
    <q-card-section
      v-if="chatStore.chatVisibility"
      class="title-bar items-center"
    >
      <h2
        v-if="chatStore.currentChatState"
        class="title"
      >
        {{ chatStore.currentChatState.theme }} ({{
          chatStore.currentChatState.type
        }})
      </h2>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="close"
        @click="chatStore.hideChat"
      />
    </q-card-section>

    <q-card-section class="messages">
      <q-scroll-area class="scroll-area">
        <q-chat-message
          v-for="(message, index) in messages"
          :key="index"
          :text="[message.content]"
          :sent="message.isUserMessage"
          :bg-color="message.isUserMessage ? 'primary' : 'grey-3'"
          :text-color="message.isUserMessage ? 'white' : 'black'"
        />
      </q-scroll-area>
    </q-card-section>

    <q-card-section class="input-area">
      <q-input
        v-model="newMessage"
        dense
        type="textarea"
        :placeholder="$t('type-a-message')"
        rows="1"
        class="input-field"
        @keyup.enter="sendMessage"
        autogrow
      >
        <template v-slot:after>
          <q-btn
            v-if="!sendingMessage && shouldShowSendButton"
            round
            dense
            flat
            color="primary"
            icon="send"
            @click="sendMessage"
          />
          <q-btn
            v-else-if="sendingMessage"
            round
            dense
            flat
            color="primary"
          >
            <q-spinner-ball
              color="primary"
              size="1.5em"
            />
          </q-btn>
        </template>
      </q-input>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { getSupabaseClient } from "src/backend/authSupabase";
import {
  converse,
  ConverseRequest,
} from "src/backend/conversationAgent/converse";
import { ChatMessage, ChatType } from "src/backend/database";
import { useChatStore } from "src/stores/chatStore";
import { computed, onMounted, ref } from "vue";
import { errorDialog } from "../dialogs/dialogController";

const supabase = getSupabaseClient();
const chatStore = useChatStore();
const messages = ref<ChatMessage[]>([]);
const newMessage = ref("");
const sendingMessage = ref(false);

const shouldShowSendButton = computed(() => {
  return newMessage.value.trim() !== "" || sendingMessage.value;
});

onMounted(async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    errorDialog.show();
    errorDialog.error.name = "Error";
    errorDialog.error.message = "You need to relogin to continue";
    return;
  }

  if (!chatStore.currentChatState) {
    errorDialog.show();
    errorDialog.error.name = "Error";
  errorDialog.error.message = "Something went wrong with the chat state";
    return;
  }

  messages.value = chatStore.chatMessages[chatStore.currentChatState._id] || [];

  // try {
  //   let history;
  //   if (chatStore.currentChatState.type === 'paper') {
  //     const paperid = await retrievePaperid(supabase, user.id, chatStore.currentChatState.label);
  //     history = await retrieveHistory(supabase, user.id, "paper", undefined, paperid);
  //   } else {
  //     const folderid = await retrieveFolderid(supabase, user.id, chatStore.currentChatState._id);
  //     history = await retrieveHistory(supabase, user.id, "folder", folderid);
  //   }

  //   messages.value = history || [];
  // } catch (error) {
  //   errorDialog.show();
  //   errorDialog.error.name = "Error";
  //   errorDialog.error.message = "Failed to retrieve chat history.";
  // }
});

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;

  sendingMessage.value = true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    errorDialog.show();
    errorDialog.error.name = "Error";
    errorDialog.error.message = "You need to relogin to continue";
    sendingMessage.value = false;
    console.log("User not found");
    return;
  }
  if (!chatStore.currentChatState) {
    errorDialog.show();
    errorDialog.error.name = "Error";
    errorDialog.error.message = "Something went wrong with the chat state";
    sendingMessage.value = false;
    console.log("Chat state not found");
    return;
  }

  const req: ConverseRequest = {
    user_uuid: user.id,
    message: newMessage.value,
    title:
      chatStore.currentChatState.type === ChatType.REFERENCE
        ? chatStore.currentChatState.theme
        : chatStore.currentChatState._id,
    type: chatStore.currentChatState.type === ChatType.REFERENCE ? "paper" : "folder",
  };

  const msg = newMessage.value;
  newMessage.value = "";
  messages.value.push({ content: msg, isUserMessage: true });

  try {
    const res = await converse(req);
    console.log("Response: ", res);
    messages.value.push({ content: res.response, isUserMessage: false });
  } catch (error) {
    errorDialog.show();
    errorDialog.error.name = "Error";
    errorDialog.error.message = "Failed to send message.";
  } finally {
    sendingMessage.value = false;
  }
};
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 400px;
  border: 1px solid #444;
  border-radius: 10px;
  overflow: hidden;
  background-color: #1f212d;
  z-index: 100;
}

.title-bar {
  width: 100%;
  height: 40px; /* Adjust height as needed */
  color: white;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #444;
  padding: 0 10px; /* Adjust padding as needed */
  box-sizing: border-box;
}

.title {
  font-size: 16px;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #1f212d;
  padding: 10px;
  box-sizing: border-box;
}

.scroll-area {
  height: 100%; /* Make scroll area fill the messages section */
}

.input-area {
  background-color: #474851;
  padding: 5px;
  display: flex;
  align-items: flex-start;
}

.input-field {
  flex: 1;
  padding: 8px;
  border-radius: 5px;
  border: none;
  background-color: #474851;
  color: white;
}

:deep(.q-field__native) {
  color: white;
}

:deep(.q-field__control) {
  background-color: #474851 !important;
}

:deep(.q-field__marginal) {
  background-color: #474851;
}
</style>
