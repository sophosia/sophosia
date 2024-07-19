<template>
  <q-card class="dialog">
    <q-card-section>
      <div class="text-h6">
        {{ $t("sign-up") }}
      </div>
    </q-card-section>
    <q-card-section>
      <slot name="providers"></slot>
    </q-card-section>
    <q-separator style="width: 90%; margin-left: 5%" />
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
        <div>
          {{ $t("password") }}
        </div>
        <div>{{ `- ${$t("password-hint")}` }}</div>
        <q-input
          v-model="authDialog.password"
          dense
          outlined
          :error="!isPasswordValid"
          :error-message="$t('password-hint')"
          :type="isPassword ? 'password' : 'text'"
        >
          <template v-slot:append>
            <q-icon
              :name="isPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="isPassword = !isPassword"
            />
          </template>
        </q-input>
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
        :disable="
          !isPasswordValid ||
          !authDialog.email ||
          authDialog.password.length === 0
        "
        @click="
          () => {
            authDialog.confirm(false);
            showEmailSentHint = true;
          }
        "
      >
        {{ $t("sign-up") }}
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
import { useAccountStore } from "src/stores/accountStore";
import { computed, ref } from "vue";
import { authDialog } from "./dialogController";

const accountStore = useAccountStore();
const isPassword = ref(true); // toggle show password
const isPasswordValid = computed(() => {
  // don't show error initially
  if (authDialog.password.length === 0) return true;
  return authDialog.password && authDialog.password.length >= 6;
});
const showEmailSentHint = ref(false);
</script>
<style scoped>
.social-media {
  border: 1px solid rgba(128, 128, 128, 0.5);
  border-radius: 0.5rem;
  padding: 1rem 3rem;
  background-color: var(--q-dark-page);
  cursor: pointer;
}
</style>
