import { getSupabaseClient } from "src/backend/authSupabase/supabaseClient";
import { open } from "@tauri-apps/api/shell";
import { defineStore } from "pinia";
import {
  authDialog,
  errorDialog,
} from "src/components/dialogs/dialogController";
import { computed, reactive, ref } from "vue";

// must have the slash after auth, otherwise the callback url becomes
// sophosia://auth#access_token=... on linux and
// sophosia://auth/#access_token=... on macos and windows
const redirectUrl = "sophosia://auth/";

const supabase = getSupabaseClient();

export const useAccountStore = defineStore("accountStore", () => {
  const initialized = ref(false);
  const user = reactive({
    email: "",
  });
  const isAuthenticated = computed(() => !!user.email);

  /**
   * Load session from local storage
   */
  async function loadState() {
    user.email = "";
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    if (data) {
      const email = data.session?.user?.email;
      if (email) user.email = email;
    }
    initialized.value = true;
  }

  /**
   * Sign up user with email and password
   * User needs to confirm email to sign in
   * @param email
   * @param password
   */
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    await loadState();
  }

  /**
   * Get all tokens from the param part of the url
   * @param urlParmas - looks like this #access_token=...&expires_at=...&...
   */
  async function parseURL(urlParmas: string) {
    const keyValues = urlParmas.replace("#", "").split("&");
    const tokens = {
      access_token: "",
      refresh_token: "",
    };
    let type = "";
    for (const keyValue of keyValues) {
      const [key, value] = keyValue.split("=");
      if (key === "access_token" || key === "refresh_token")
        tokens[key] = value;
      if (key === "type") type = value;
    }
    // sign in the user
    await signInWithTokens(tokens);

    // change ui to let user modify password
    // since user has signed in, just modifyUser with new password
    if (type === "recovery") {
      authDialog.authView = "resetPassword";
      authDialog.onConfirm(() => {
        supabase.auth.updateUser({
          password: authDialog.password,
        });
      });
      authDialog.show();
    } else {
      authDialog.close();
    }
  }

  /**
   * After user confirms the email, the link redicts back to the app
   * Get the sign in session using the access token and refresh token
   * The session will be saved to local storage automatically
   * @param url
   */
  async function signInWithTokens(tokens: {
    access_token: string;
    refresh_token: string;
  }) {
    const { data, error } = await supabase.auth.setSession(tokens);
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    await loadState();
  }

  /**
   * Sign in user and store session in local storage
   * @param email
   * @param password
   */
  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    await loadState();
  }

  /**
   * Sign in user using OAuth providers
   * OAuth provider will be opened in user's default browser
   * After confirm, tokens will be returned to this app by deep link
   * @param provider
   */
  async function signInWithOAuth(provider: "google" | "github") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    if (data.url) await open(data.url);
  }

  /**
   * Sign out user and remove session from local storage
   */
  async function signOut() {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    await loadState();
  }

  /**
   * Sends a reset password email to user
   * After user clicks the link, tokens will be send back to this app through deep link
   * Then login using the temporary token and allow user to update their password
   * @param email
   */
  async function resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
  }

  /**
   * Update user's data, such as password
   * @param attributes
   */
  async function updateUser(attributes: { name?: string; password?: string }) {
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error) {
      errorDialog.error = error;
      errorDialog.show();
    }
    await loadState();
  }

  return {
    initialized,
    isAuthenticated,
    user,
    loadState,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    parseURL,
    resetPassword,
    updateUser,
  };
});
