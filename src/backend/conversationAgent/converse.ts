import { getClient, Body, ResponseType } from "@tauri-apps/api/http";

const converseUrl = import.meta.env.VITE_CONVERSE_URL;
const streamUrl = "http://localhost:8000/converse";
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
export async function converse(
  params: ConverseRequest
): Promise<ConverseResponse> {
  const client = await getClient();
  try {
    const response = await client.request({
      headers: { "Content-Type": "application/json" },
      method: "POST",
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

export async function* converseStream(
  params: ConverseRequest
): AsyncGenerator<string | ConverseResponse> {
  try {
    console.log("Sending request to:", streamUrl);
    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let retrievedNodes: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            yield { response: fullResponse, retrievedNodes };
            return;
          } else if (data.startsWith("NODES_DATA:")) {
            const nodesData = data.slice(11);
            try {
              // Attempt to parse as JSON first
              retrievedNodes = JSON.parse(nodesData);
            } catch (error) {
              console.log("retrieving nodes failed", error);
            }
          } else {
            fullResponse += data;
            yield data;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in converseStream:", error);
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network error: Unable to connect to the server. Please check your internet connection and try again."
      );
    }
    throw error;
  }
}
