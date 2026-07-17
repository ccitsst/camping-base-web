import { GoogleGenAI } from '@google/genai';
import type { Message, Attachment } from '../types';

/**
 * Fetch the list of available Gemini models using the new GoogleGenAI SDK.
 */
export async function fetchModels(
  apiKey: string,
  baseUrl: string
): Promise<{ name: string; displayName: string }[]> {
  const cleanBaseUrl = baseUrl.trim() ? baseUrl.trim() : undefined;
  
  // Instantiate GenAI client
  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: cleanBaseUrl ? { baseUrl: cleanBaseUrl } : undefined,
  });

  // Call models list API — returns a Pager, which only supports async
  // iteration (for await...of); it has no .models property, and iterating
  // it this way also auto-fetches subsequent pages via nextPageToken.
  const response = await ai.models.list();

  const modelsList: any[] = [];
  for await (const model of response as any) {
    modelsList.push(model);
  }

  if (modelsList.length === 0) {
    throw new Error('API 沒有回傳任何可用的模型。');
  }

  // Filter for models supporting content generation
  const filtered = modelsList
    .filter((model: any) => {
      const methods = model.supportedGenerationMethods || [];
      return methods.includes('generateContent') || model.name?.includes('gemini');
    })
    .map((model: any) => {
      const name = model.name || '';
      // Clean name (e.g. models/gemini-2.5-flash -> gemini-2.5-flash)
      const cleanName = name.startsWith('models/') ? name.substring(7) : name;
      let displayName = model.displayName || cleanName;
      return { name: cleanName, displayName };
    });

  if (filtered.length === 0) {
    throw new Error('API 回傳的模型中沒有支援 generateContent 的模型。');
  }

  return filtered;
}

/**
 * Map our local Message attachment to the format expected by the Gemini SDK.
 */
function mapAttachmentToPart(attachment: Attachment) {
  if (!attachment.base64) {
    throw new Error(`Attachment ${attachment.name} is missing base64 data`);
  }
  return {
    inlineData: {
      mimeType: attachment.type,
      data: attachment.base64,
    },
  };
}

/**
 * Sends a message stream to Gemini using the new GoogleGenAI SDK.
 */
export async function streamGeminiChat(
  apiKey: string,
  baseUrl: string,
  modelName: string,
  systemPrompt: string,
  history: Message[],
  currentMessageText: string,
  currentAttachments: Attachment[],
  onChunk: (text: string) => void
): Promise<string> {
  const cleanBaseUrl = baseUrl.trim() ? baseUrl.trim() : undefined;
  
  // Initialize the new SDK client
  const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: cleanBaseUrl ? { baseUrl: cleanBaseUrl } : undefined,
  });

  // Construct contents array. It must alternate between 'user' and 'model'.
  const contents: any[] = [];

  // Filter and format history
  const filteredHistory = history.filter(msg => msg.role === 'user' || msg.role === 'model');
  
  filteredHistory.forEach((msg) => {
    const parts: any[] = [];
    
    if (msg.content.trim()) {
      parts.push({ text: msg.content });
    }
    
    if (msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach(att => {
        try {
          parts.push(mapAttachmentToPart(att));
        } catch (e) {
          console.warn('Skipping historical attachment mapping:', e);
        }
      });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      });
    }
  });

  // Add current message
  const currentParts: any[] = [];
  if (currentMessageText.trim()) {
    currentParts.push({ text: currentMessageText });
  }
  
  currentAttachments.forEach((att) => {
    currentParts.push(mapAttachmentToPart(att));
  });

  if (currentParts.length === 0) {
    throw new Error('Cannot send an empty message without attachments');
  }

  contents.push({
    role: 'user',
    parts: currentParts,
  });

  // Clean the payload to ensure strictly alternating user/model roles.
  const cleanContents: any[] = [];
  let expectedRole = 'user';
  
  for (const item of contents) {
    if (item.role === expectedRole) {
      cleanContents.push(item);
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    } else {
      if (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === item.role) {
        cleanContents[cleanContents.length - 1].parts.push(...item.parts);
      } else {
        console.warn(`Skipping out-of-order role in Gemini API payload: expected ${expectedRole}, got ${item.role}`);
      }
    }
  }

  if (cleanContents.length === 0) {
    cleanContents.push({
      role: 'user',
      parts: currentParts
    });
  }

  // Clean name (e.g. models/gemini-2.5-flash -> gemini-2.5-flash)
  const cleanModelName = modelName.startsWith('models/') ? modelName.substring(7) : modelName;

  // Execute the stream using models.generateContentStream
  const responseStream = await ai.models.generateContentStream({
    model: cleanModelName,
    contents: cleanContents,
    config: {
      systemInstruction: systemPrompt.trim() ? systemPrompt : undefined,
    }
  });

  let fullResponseText = '';
  for await (const chunk of responseStream) {
    // Safely extract text from chunk
    const chunkText = typeof (chunk as any).text === 'function' 
      ? (chunk as any).text() 
      : (chunk as any).text;

    if (chunkText) {
      fullResponseText += chunkText;
      onChunk(chunkText);
    }
  }

  return fullResponseText;
}
