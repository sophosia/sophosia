<template>
  <div class="chat-window">
    <div class="title-bar" v-if="chatStore.chatVisibility">
      <h2 v-if="chatStore.currentChatState">
        {{ chatStore.currentChatState.label }} ({{ chatStore.currentChatState.type }})
      </h2>
      <h2 v-else>Chat</h2>
      <q-btn class="delete-button" @click="chatStore.hideChat">x</q-btn>
    </div>
    <div class="messages">
      <Message
        v-for="(message, index) in messages"
        :key="index"
        :content="message.content"
        :isUserMessage="message.isUserMessage"
      />
    </div>
    <div class="input-area">
      <textarea
        v-model="newMessage"
        placeholder="Type a message..."
        class="input-field"
        @keyup.enter="sendMessage"
      ></textarea>
      <button 
        v-if="newMessage.trim()"
        @click="sendMessage" 
        class="send-button"
      >
      </button>
    </div>
  </div>
</template>
  
  
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Message from './Message.vue';
import { useChatStore } from 'src/stores/chatStore';
import { getSupabaseClient } from 'src/backend/authSupabase';
import { converse, ConverseRequest, ConverseResponse } from 'src/backend/conversationAgent/converse';
import { errorDialog } from '../dialogs/dialogController';
import { retrieveFolderid, retrievePaperid, retrieveHistory, ChatMessage } from 'src/backend/conversationAgent';

const supabase = getSupabaseClient();
const chatStore = useChatStore();
const messages = ref<ChatMessage[]>([]);
const newMessage = ref('');

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser();
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

  try {
    let history;
    //TODO: verify why the  retrieve history function fails to retrieve the chat logs
    if (chatStore.currentChatState.type === 'paper') {
      const paperid = await retrievePaperid(supabase, user.id, chatStore.currentChatState.label);
      console.log("paperid", paperid);
      history = await retrieveHistory(supabase, user.id, "paper", undefined, paperid);
    } else {
    
      const folderid = await retrieveFolderid(supabase, user.id, chatStore.currentChatState?._id);
      console.log("folderid", folderid);
      history = await retrieveHistory(supabase, user.id, "paper", folderid);
    }

    messages.value = history || [];
  } catch (error) {
    errorDialog.show();
    errorDialog.error.name = "Error";
    errorDialog.error.message = "Failed to retrieve chat history.";
  }
});

const sendMessage = async () => {
  const { data: { user } } = await supabase.auth.getUser();
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

  if (newMessage.value.trim()) {
    const req: ConverseRequest = {
      user_uuid: user.id,
      message: newMessage.value,
      title: "",
      type: chatStore.currentChatState.type
    };

    if (chatStore.currentChatState.type === 'paper') {
      req.title = chatStore.currentChatState.label;
    } else {
      req.title = chatStore.currentChatState._id;
    }

    messages.value.push({ content: newMessage.value, isUserMessage: true });
    try {
      const res: ConverseResponse = await converse(req);
      messages.value.push({ content: res.response, isUserMessage: false });
      newMessage.value = '';
    } catch (error) {
      errorDialog.show();
      errorDialog.error.name = "Error";
      errorDialog.error.message = "Failed to send message.";
    }
  }
};
</script>

  
  <style scoped>
  .chat-window {
    display: flex;
    flex-direction: column;
    height: 300px;
    width: 600px;
    border: 1px solid #444;
    border-radius: 10px;
    overflow: hidden;
    background-color: #1F212D;
  }
  .title-bar {
    width: 100%;
    height: 25px; /* adjust this value to your desired height */
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-bottom: 1px solid #444;
  }
  
  .title-bar h2 {
    margin: 0 auto;
    justify-content: space-between;
    font-size: 16px;
  }
  
  .messages {
    flex: 1;
    padding: 10px;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
  }
  
  .input-area {
    padding: 5px;
    display: flex;
    max-height: 300px;
    background-color:#474851;
    align-items: flex-start;
    
  }
  
  .input-field {
    flex: 1;
    padding: 8px;
    border-radius: 5px;
    border: none;
    margin-right: 10px;
    background-color: #474851;
    overflow-y: auto;
    resize: none;
  }
  .input-field:focus {
    border: none; 
    outline: none; 
  }
  .input-field::-webkit-scrollbar {
    width: 8px; /* Width of the scrollbar */
  }
  .input-field::-webkit-scrollbar-thumb {
    background-color: #888; /* Color of the scrollbar thumb */
    border-radius: 10px; /* Rounded corners of the scrollbar thumb */
  }
  
  .input-field::-webkit-scrollbar-thumb:hover {
    background-color: #555; /* Darker color when hovering over the scrollbar thumb */
  }
  
  .input-field::-webkit-scrollbar-track {
    background-color: #f1f1f1; /* Color of the track (part the thumb moves within) */
  }
  
  .send-button {
    padding: 8px 12px;
    background-color: orange;
    height: 50px;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    height: 28px;
  }
  
  .send-button:hover {
    background-color: orangered;
  }

  .delete-button {
    position: relative; /* Changed from absolute to relative */
    margin-left: auto; /* Added to push the button to the right */
    font-size: 16px;
    cursor: pointer;
  }
  </style>