export interface Attachment {
  name: string;
  type: string; // mime type, e.g., 'image/png', 'audio/webm', 'application/pdf'
  dataUrl: string; // for rendering locally (e.g. data:image/png;base64,... or blob:...)
  base64?: string; // pure base64 string for Gemini API call
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface Settings {
  apiKey: string;
  systemPrompt: string;
  selectedModel: string;
  baseUrl: string;
}
