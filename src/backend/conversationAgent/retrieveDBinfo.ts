import { SupabaseClient } from "@supabase/supabase-js";
import { ChatMessage } from "../database";

// Define the structure of the database row
interface ChatLogRow {
  log: string;
  author: "assistant" | "user";
}

/**
 *  Retrieves the chat history from the cloud database
 * @param supabase  SupabaseClient
 * @param type either paper (reference) or folder (category)
 * @param category_id the cloud id of the category
 * @param reference_id the cloud id of the reference
 * @returns ChatMessage[] | []
 */
export async function retrieveHistory(
  supabase: SupabaseClient,
  type: string,
  category_id?: string,
  reference_id?: string
): Promise<ChatMessage[]> {
  const query = supabase
    .from("chat-logs")
    .select("*")
    .eq("type", type)
    .order("created_at", { ascending: true });

  if (category_id) {
    query.eq("folder_id", category_id);
  }

  if (reference_id) {
    query.eq("paper_id", reference_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching chat logs:", error);
    throw error;
  }

  return (data as ChatLogRow[]).map((row) => ({
    content: row.log,
    isUserMessage: row.author === "user",
  }));
}

/**
 *  Retrieves the cloud id of reference
 * @param supabase the supabase client
 * @param reference_label the label of the reference
 * @returns the cloud id of the reference
 */

export async function retrieveReferenceid(
  supabase: SupabaseClient,
  reference_label: string
): Promise<string> {
  const { data, error } = await supabase
    .from("paper")
    .select("id")
    .eq("title", reference_label);

  if (error) {
    console.error("Error fetching paper:", error);
    throw error;
  }
  return data[0].id;
}

/**
 * Retrieves the cloud id of the category
 * @param supabase the supabase client
 * @param category_uid the local category id
 * @returns the cloud id of the category
 */
export async function retrieveCategoryid(
  supabase: SupabaseClient,
  category_uid: string
): Promise<string> {
  const { data, error } = await supabase
    .from("folder")
    .select("id")
    .eq("title", category_uid);

  if (error) {
    console.error("Error fetching folder:", error);
    throw error;
  }
  return data[0].id;
}
