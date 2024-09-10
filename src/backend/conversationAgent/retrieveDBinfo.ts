import { SupabaseClient } from '@supabase/supabase-js';
import { ChatMessage } from '../database';
// Define the structure of a chat message


// Define the structure of the database row
interface ChatLogRow {
  log: string;
  author: 'assistant' | 'user';
  // Add other fields if needed, but we won't use them in this function
}


export async function retrieveHistory(
  supabase: SupabaseClient,
  type: string,
  folder_id?: string,
  paper_id?: string
): Promise<ChatMessage[]> {
  const query = supabase
    .from('chat-logs')
    .select('*')
    .eq('type', type)
    .order('created_at', { ascending: true });
    console.log("------------------------------------------");
    console.log("folder_id", folder_id);
    console.log("paper_id", paper_id);
    console.log("type", type);
    console.log("------------------------------------------");

  if (folder_id) {
    query.eq('folder_id', folder_id);
  }

  if (paper_id) {
    query.eq('paper_id', paper_id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching chat logs:', error);
    throw error;
  }

  return (data as ChatLogRow[]).map((row) => ({
    content: row.log,
    isUserMessage: row.author === 'user',
  }));
}


export async function retrievePaperid(supabase: SupabaseClient, user_uuid: string, paper_label: string): Promise<string> {
  
    const { data, error } = await supabase
      .from('paper')
      .select("id")
      .eq("user_uuid", user_uuid)
      .eq("title", paper_label)
     
  
    if (error) {
      console.error('Error fetching paper:', error);
      throw error;
    }
    return data[0].id;
  }


export async function retrieveFolderid(supabase: SupabaseClient, user_uuid: string, folder_uid: string): Promise<string> {
  
    const { data, error } = await supabase
      .from('folder')
      .select("id")
      .eq("user_uuid", user_uuid)
      .eq("title", folder_uid)
     
  
    if (error) {
      console.error('Error fetching folder:', error);
      throw error;
    }
    return data[0].id;
  }

