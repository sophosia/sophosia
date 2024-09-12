import { getClient, Body, ResponseType } from '@tauri-apps/api/http';

const converseUrl = import.meta.env.VITE_CONVERSE_URL;
export interface ConverseRequest {
  user_uuid: string;
  message: string;
  title: string;
  type: string;
}

export interface ConverseResponse {
  response: string;
  retrievedNodes: any[];
}
/**
 * Sends a message to the conversation agent and returns the response
 * @param params ConverseRequest
 * @returns ConverseResponse
  */
export async function converse(params: ConverseRequest): Promise<ConverseResponse> {
  const client = await getClient();
  try {
    const response = await client.request( {
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      url: converseUrl,
      body: Body.json(params),
      responseType: ResponseType.JSON,
    });
    return response.data as ConverseResponse;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

