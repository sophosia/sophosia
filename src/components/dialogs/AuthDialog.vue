<template>
  <q-dialog v-model="authDialog.visible">
    <SignInDialog v-if="authDialog.authView === 'signIn'">
      <template #providers>
        <OAuthProviders
          @signInWithOAuth="
            (provider) => accountStore.signInWithOAuth(provider)
          "
        />
      </template>
    </SignInDialog>
    <SignUpDialog v-else-if="authDialog.authView === 'signUp'">
      <template #providers>
        <OAuthProviders
          @signInWithOAuth="
            (provider) => accountStore.signInWithOAuth(provider)
          "
        />
      </template>
    </SignUpDialog>
    <ForgetPasswordDialog
      v-else-if="authDialog.authView === 'forgetPassword'"
    />
    <ResetPasswordDialog v-else-if="authDialog.authView === 'resetPassword'" />
  </q-dialog>
</template>
<script setup lang="ts">
import { useAccountStore } from "src/stores/accountStore";
import ForgetPasswordDialog from "./ForgetPasswordDialog.vue";
import OAuthProviders from "./OAuthProviders.vue";
import ResetPasswordDialog from "./ResetPasswordDialog.vue";
import SignInDialog from "./SignInDialog.vue";
import SignUpDialog from "./SignUpDialog.vue";
import { authDialog } from "./dialogController";

const accountStore = useAccountStore();
</script>
