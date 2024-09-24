<template>
  <q-card class="explain-window">
    <q-card-section
      v-if="true"
      class="title-bar items-center"
    >
      <h2
        v-if="true"
        class="title"
      >
        {{ $t("explain") }}
      </h2>
      <q-space />
      <q-btn
        flat
        round
        dense
        icon="close"
        @click=""
      />
    </q-card-section>

    <q-card-section class="messages">
      <q-scroll-area
        ref="scrollAreaRef"
        class="scroll-area"
      >
        <q-chat-message
          v-for="(message, index) in messages"
          :key="index"
          :text="[message.content]"
          :sent="message.isUserMessage"
          :bg-color="message.isUserMessage ? 'primary' : 'grey-3'"
          :text-color="message.isUserMessage ? 'white' : 'black'"
          class="message-content"
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
import { useChatStore } from "src/stores/chatStore";
import { ref, computed, nextTick } from "vue";
import { ChatMessage } from "src/backend/database";
import { QScrollArea } from "quasar";

const messages = ref<ChatMessage[]>([]);
const newMessage = ref("");
const sendingMessage = ref(false);
const scrollAreaRef = ref<QScrollArea>();

const scrollToBottom = () => {
  nextTick(() => {
    const scrollArea = scrollAreaRef.value;
    if (scrollArea) {
      const scrollTarget = scrollArea.$el!.querySelector(
        ".q-scrollarea__container"
      );
      if (scrollTarget) {
        scrollTarget.scrollTop = scrollTarget.scrollHeight;
      }
    }
  });
};

const shouldShowSendButton = computed(() => {
  return newMessage.value.trim() !== "" || sendingMessage.value;
});

const sendMessage = async () => {
  // Send message function is empty
};
</script>

<style scoped>
.explain-window {
  display: flex;
  flex-direction: column;
  left: 60%;
  top: 10%;
  height: 80vh;
  width: 45vh;
  opacity: 0.9;
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
  user-select: text; /* Allow text selection */
}

.scroll-area {
  height: 100%; /* Make scroll area fill the messages section */
}

.message-content {
  cursor: text; /* Show text cursor to indicate selectable text */
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
