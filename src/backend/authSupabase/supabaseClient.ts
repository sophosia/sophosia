import {SupabaseClient, createClient } from "@supabase/supabase-js";
import { c } from "vitest/dist/reporters-5f784f42";

// const supabaseUrl= import.meta.env.VITE_SUPABASE_URL ;
const supabaseUrl = "https://plcyjwjhmvykeypakwgc.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabaseClient: SupabaseClient | null = null;

/**
 * Creates a single instance of the SupabaseClient
 * @returns SupabaseClient
 */
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