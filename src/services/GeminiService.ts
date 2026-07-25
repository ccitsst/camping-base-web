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
      tools: [{ googleSearch: {} }],
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

/**
 * Parses, cleans, and translates API error messages.
 * Adds context-aware suggestions for model names or API keys, and formats
 * debug information (code/status) as secondary muted content.
 */
export async function formatErrorMessage(error: any): Promise<string> {
  let messageText = '';
  let errorCode: string | number | undefined = undefined;
  let errorStatus: string | undefined = undefined;

  // Helper to extract details from an error-like object
  const extractDetails = (obj: any) => {
    if (!obj) return;
    
    // Look for error.message nested
    if (obj.error && typeof obj.error === 'object') {
      if (obj.error.message) messageText = obj.error.message;
      if (obj.error.code !== undefined) errorCode = obj.error.code;
      if (obj.error.status) errorStatus = obj.error.status;
    } else if (obj.message) {
      messageText = obj.message;
      if (obj.code !== undefined) errorCode = obj.code;
      if (obj.status) errorStatus = obj.status;
    }
  };

  // 1. Try to inspect error as object
  if (error && typeof error === 'object') {
    extractDetails(error);
    // If message is a JSON string, try to parse it
    if (messageText) {
      try {
        const parsed = JSON.parse(messageText);
        extractDetails(parsed);
      } catch (e) {
        // Keep original messageText if not JSON
      }
    }
    // Fallback if messageText is still empty
    if (!messageText) {
      if (error.message) {
        messageText = error.message;
        try {
          const parsed = JSON.parse(messageText);
          extractDetails(parsed);
        } catch (e) {}
      } else {
        messageText = String(error);
      }
    }
    if (error.code !== undefined && errorCode === undefined) errorCode = error.code;
    if (error.status && errorStatus === undefined) errorStatus = error.status;
  } else {
    messageText = String(error);
  }

  // If the final message is still a JSON string (could be double-encoded), try parsing it again
  if (typeof messageText === 'string' && (messageText.trim().startsWith('{') || messageText.trim().startsWith('['))) {
    try {
      const parsed = JSON.parse(messageText);
      extractDetails(parsed);
    } catch (e) {}
  }

  // Ensure messageText is a string
  if (typeof messageText !== 'string') {
    messageText = JSON.stringify(messageText);
  }

  // 2. Translate messageText to Traditional Chinese
  let translatedText = '';
  if (messageText && messageText.trim() && !messageText.includes('API key not valid')) {
    try {
      // Use MyMemory API for translation
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(messageText.trim())}&langpair=en|zh-TW`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.responseData && data.responseData.translatedText) {
          translatedText = data.responseData.translatedText;
        }
      }
    } catch (e) {
      console.warn('MyMemory translation failed:', e);
    }
  }

  // Handle common key-related message explicitly for nicer user-facing Chinese
  if (messageText.includes('API key not valid')) {
    translatedText = 'Gemini API 金鑰無效。請確認您的金鑰是否正確設定。';
  }

  // 3. Format output
  let output = `⚠️ **AI 沒有回應**\n\n`;
  if (translatedText) {
    output += `${translatedText}`;
  } else {
    output += `${messageText}`;
  }

  // 4. Custom reminders based on error content
  const lowerMsg = messageText.toLowerCase();
  
  if (lowerMsg.includes('models/') || lowerMsg.includes('modes/')) {
    output += `\n\n💡 **提醒：** 試試其他語言模型吧`;
  }

  if (lowerMsg.includes('api_key') || lowerMsg.includes('api key')) {
    output += `\n\n🔑 **提醒：** 偵測到 API 金鑰相關錯誤。如果您帳號仍有額度的話，請到 [AI Studio](https://aistudio.google.com/app/api-keys) 申請一個新的 API KEY 試試。`;
  }

  // 5. Append secondary debug info
  if (errorCode !== undefined || errorStatus) {
    const codePart = errorCode !== undefined ? errorCode : '';
    const statusPart = errorStatus ? errorStatus : '';
    const space = codePart && statusPart ? ' ' : '';
    output += `\n\n---\n\n# ${codePart}${space}${statusPart}`;
  }

  return output;
}
