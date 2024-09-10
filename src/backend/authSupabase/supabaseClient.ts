import {SupabaseClient, createClient } from "@supabase/supabase-js";

const supabaseUrl= import.meta.env.VITE_SUPABASE_URL ;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabaseClient) {
    _supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: "sophosiaAuth",
        storage: window.localStorage,
        flowType:"implicit",
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return _supabaseClient;
}