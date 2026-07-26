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

export interface Product {
  category: string;     // 商品類別
  id: string;           // 商品編號
  brand: string;        // 品牌
  name: string;         // 品名
  weight: string;       // 重量
  rent1: string;        // 兩天一夜租金
  rent2: string;        // 續租日租金
  deposit: string;      // 押金
  status: string;       // 上架狀態
  rentStatus: string;   // 出租中 / 歸還日
  reservation: string;  // 預約
  details: { [key: string]: string }; // 其他特規 (如帳篷容量、背包背長、睡袋極限溫度等)
}

