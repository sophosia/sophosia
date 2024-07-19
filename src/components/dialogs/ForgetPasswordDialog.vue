<template>
  <q-card class="dialog">
    <q-card-section>
      <div class="text-h6">
        {{ $t("reset-password") }}
      </div>
    </q-card-section>
    <q-card-section>
      <div class="column q-gutter-sm">
        <div>
          {{ $t("email") }}
        </div>
        <q-input
          v-model="authDialog.email"
          dense
          outlined
        />
      </div>
      <div class="column items-center">
        <a
          class="link"
          @click="authDialog.authView = 'signIn'"
        >
          {{ $t("sign-in-hint") }}
        </a>
      </div>
    </q-card-section>
    <q-card-actions align="right">
      <q-btn
        color="secondary"
        no-caps
        :ripple="false"
        @click="authDialog.close()"
      >
        {{ $t("cancel") }}
      </q-btn>
      <q-btn
        color="secondary"
        no-caps
        :ripple="false"
        :disable="!authDialog.email"
        @click="
          () => {
            authDialog.confirm(false);
            showEmailSentHint = true;
          }
        "
      >
        {{ $t("send-email") }}
      </q-btn>
    </q-card-actions>
    <q-card-section v-if="showEmailSentHint">
      <div
        style="color: var(--q-primary)"
        class="column items-center"
      >
        {{ $t("email-sent") }}
      </div>
    </q-card-section>
  </q-card>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { authDialog } from "./dialogController";

const showEmailSentHint = ref(false);
</script>
