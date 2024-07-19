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
          {{ $t("password") }}
        </div>
        <q-input
          v-model="authDialog.password"
          dense
          outlined
          :hint="$t('password-hint')"
          :error="!isPasswordValid"
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
        :disable="!isPasswordValid || authDialog.password.length === 0"
        @click="authDialog.confirm()"
      >
        {{ $t("reset-password") }}
      </q-btn>
    </q-card-actions>
  </q-card>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { authDialog } from "./dialogController";

const isPassword = ref(true); // toggle show password
const isPasswordValid = computed(() => {
  // don't show error initially
  if (authDialog.password.length === 0) return true;
  return authDialog.password && authDialog.password.length >= 6;
});
</script>
