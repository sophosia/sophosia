<template>
    <div :class="messageClass" class="message">
      <span :class="identifierClass">{{ identifierText }}</span>
      {{ content }}
    </div>
  </template>
  
  <script setup lang="ts">
  import { computed, defineProps } from 'vue';
  
  const props = defineProps({
    content: String,
    isUserMessage: Boolean
  });
  
  const messageClass = computed(() => ({
    'user-message': props.isUserMessage,
    'assistant-message': !props.isUserMessage
  }));
  
  const identifierText = computed(() => props.isUserMessage ? '' : 'Assistant');
  const identifierClass = computed(() => ({
    'identifier': true,
    'identifier-user': props.isUserMessage,
    'identifier-assistant': !props.isUserMessage
  }));
  </script>
  
  <style scoped>
  .message {
    
    border-radius: 10px;
    max-width: 60%;
    overflow-wrap: break-word;
    white-space: normal;
    padding: 10px;
    position: relative;
  }
  
  .identifier {
    position: absolute;
    top: -10px;
    left: 10px;
    font-size: 0.75rem;
    color: #888;
  }
  
  .identifier-user {
    color: lightblue;
  }
  
  .identifier-assistant {
    color: lightgreen;
  }
  
  .user-message {
   
    align-self: flex-end;
  }
  
  .assistant-message {
    
    align-self: flex-start;
  }
  </style>
  