import { SupabaseClient } from '@supabase/supabase-js';

// Define the structure of a chat message
export interface ChatMessage {
  content: string;
  isUserMessage: boolean;
}

// Define the structure of the database row
interface ChatLogRow {
  log: string;
  author: 'assistant' | 'user';
  // Add other fields if needed, but we won't use them in this function
}


export async function retrieveHistory(supabase: SupabaseClient, user_uuid: string,type:string, folder_id?: string, paper_id?: string): Promise<ChatMessage[]> {
  
  const { data, error } = await supabase
    .from('chat-logs')
    .select('*')
    .eq('user_uuid', user_uuid)
    .eq('type', type)
    .eq('folder_id', folder_id)
    .eq('paper_id',paper_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat logs:', error);
    throw error;
  }

  return (data as ChatLogRow[]).map(row => ({
    content: row.log,
    isUserMessage: row.author === 'user'
  }));
}



export async function retrievePaperid(supabase: SupabaseClient, user_uuid: string, paper_label: string): Promise<string> {
  
    const { data, error } = await supabase
      .from('paper')
      .select("id")
      .eq("user_uuid", user_uuid)
      .eq("title", paper_label)
     
  
    if (error) {
      console.error('Error fetching chat logs:', error);
      throw error;
    }
    return data[0].id;
  }


export async function retrieveFolderid(supabase: SupabaseClient, user_uuid: string, folder_uid: string): Promise<string> {
  
    const { data, error } = await supabase
      .from('paper')
      .select("id")
      .eq("user_uuid", user_uuid)
      .eq("title", folder_uid)
     
  
    if (error) {
      console.error('Error fetching chat logs:', error);
      throw error;
    }
    return data[0].id;
  }

