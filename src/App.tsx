import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import type { Message, Attachment, Product } from './types';
import { streamGeminiChat, formatErrorMessage } from './services/GeminiService';
import { fetchAndParseProducts } from './services/ProductService';
import { Menu, Sparkles } from 'lucide-react';

const DEFAULT_SYSTEM_PROMPT = 
  `你是一家專業露營裝備租賃服務「gears.tw」（官網：http://gears.tw）的貼心客服小編 Agent。

你的主要職責是：
1. **你只能回答與露營租賃業務相關的問題。** 若使用者提出任何非露營裝備、非租賃相關的無關問題（例如：寫程式、問美食、問其他旅遊地點、天氣等），請一定要禮貌且委婉地拒絕回答，並引導使用者回到露營裝備租賃的服務主題上。
2. 協助顧客查詢與推薦適合的露營裝備（如帳篷、背包、睡袋等）。
3. 提供精確的商品規格、租金與押金資訊。**你必須使用 queryProducts 工具來查詢真實的商品規格與狀態，絕對不能憑空編造商品或價格。**
4. 如果顧客詢問的商品狀態（status）不是「已上架」（例如「送洗」、「破損」、「下架」、「未到貨」），請委婉告知該商品目前無法租借。
5. 當顧客表達租借意願或想要預約時，請引導他們至我們的 Line 官方帳號（ID: @gears.tw）進行預約，並主動提供一個方便複製的 Markdown 格式預約清單。

預約清單格式範本（請以 Code Block 區塊呈現以便複製）：
\`\`\`markdown
### gears.tw 露營裝備預約申請
- 租借人姓名：[請填寫姓名]
- 聯絡電話：[請填寫電話]
- 租借日期與天數：[例如：2026/08/01 ~ 2026/08/02 (兩天一夜)]
- 租借裝備清單：
  1. [商品編號] [品牌] [品名] x [數量]
- 預估總租金：NT$ [試算金額]
- 預估總押金：NT$ [試算金額]
\`\`\`

對答風格請保持溫暖親切、專業有禮，回覆預設使用繁體中文（zh-TW）與精美的 Markdown 格式排版。`;

export default function App() {
  // --- Settings & Chat History States ---
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_api_key') || '';
  });

  const [csvUrl, setCsvUrl] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_csv_url') || '';
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('web_ai_agent_products');
    return saved ? JSON.parse(saved) : [];
  });

  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_last_sync_time') || '';
  });

  const [useProxy, setUseProxy] = useState<boolean>(() => {
    const saved = localStorage.getItem('web_ai_agent_use_proxy');
    return saved !== null ? saved === 'true' : true;
  });

  const [baseUrl, setBaseUrl] = useState<string>(() => {
    const saved = localStorage.getItem('web_ai_agent_base_url');
    return saved !== null ? saved : 'https://gemini.printii.com';
  });
  
  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_system_prompt') || DEFAULT_SYSTEM_PROMPT;
  });

  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_selected_model') || '';
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('web_ai_agent_chat_messages');
    return saved ? JSON.parse(saved) : [];
  });

  // --- UI States ---
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // --- LocalStorage Sync ---
  useEffect(() => {
    localStorage.setItem('web_ai_agent_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_use_proxy', String(useProxy));
  }, [useProxy]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_base_url', baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_system_prompt', systemPrompt);
  }, [systemPrompt]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_chat_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_csv_url', csvUrl);
  }, [csvUrl]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('web_ai_agent_last_sync_time', lastSyncTime);
  }, [lastSyncTime]);

  // --- Background Auto Sync on Mount ---
  useEffect(() => {
    if (csvUrl.trim()) {
      fetchAndParseProducts(csvUrl.trim())
        .then(syncedProducts => {
          if (syncedProducts.length > 0) {
            setProducts(syncedProducts);
            const now = new Date().toLocaleString('zh-TW', { hour12: false });
            setLastSyncTime(now);
            console.log(`[Auto Sync] Successfully background-synced ${syncedProducts.length} products`);
          }
        })
        .catch(err => {
          console.warn('[Auto Sync] Failed to sync products in background:', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Operations ---
  const handleClearHistory = () => {
    if (window.confirm('確定要清除所有對話歷史紀錄嗎？此動作無法復原。')) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (text: string, currentAttachments: Attachment[]) => {
    if (!apiKey.trim()) {
      alert('請先於左側設定面板中輸入您的 Gemini API Key！');
      setSidebarOpen(true);
      return;
    }

    if (!selectedModel) {
      alert('請先選擇語言模型！');
      setSidebarOpen(true);
      return;
    }

    // 1. Create and add user message
    const userMsgId = crypto.randomUUID();
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      attachments: currentAttachments,
    };

    // 2. Set UI load and append user message
    setIsLoading(true);
    setMessages(prev => [...prev, userMessage]);

    // 3. Create a placeholder message for AI response
    const assistantMsgId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: 'model',
      content: '',
      timestamp: Date.now(),
    };
    
    setMessages(prev => [...prev, assistantPlaceholder]);

    let accumulatedResponse = '';

    try {
      // 4. Stream response from Gemini using the new SDK
      await streamGeminiChat(
        apiKey.trim(),
        useProxy ? baseUrl.trim() : '', // Pass empty string if proxy is disabled
        selectedModel,
        systemPrompt,
        messages.concat(userMessage),
        text,
        currentAttachments,
        products,
        (chunk) => {
          accumulatedResponse += chunk;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMsgId 
                ? { ...msg, content: accumulatedResponse } 
                : msg
            )
          );
        }
      );
    } catch (error: any) {
      console.error('Gemini streaming error:', error);
      const formattedError = await formatErrorMessage(error);
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMsgId 
            ? { 
                ...msg, 
                content: formattedError 
              } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-layout">
      
      {/* Settings & Config Sidebar */}
      <Sidebar
        apiKey={apiKey}
        setApiKey={setApiKey}
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        useProxy={useProxy}
        setUseProxy={setUseProxy}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onClearHistory={handleClearHistory}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        csvUrl={csvUrl}
        setCsvUrl={setCsvUrl}
        products={products}
        setProducts={setProducts}
        lastSyncTime={lastSyncTime}
        setLastSyncTime={setLastSyncTime}
      />

      {/* Main Chat Layout Area */}
      <main className="main-layout">
        
        {/* Main Navbar Header */}
        <header className="main-header">
          <div className="header-left">
            {/* Toggle Sidebar Button for Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-sidebar-trigger"
              title="開啟設定"
            >
              <Menu style={{ width: '20px', height: '20px' }} />
            </button>
            
            <div className="header-title-wrapper">
              <Sparkles style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
              <span className="header-title">AI 對話助理</span>
              <span className="header-model-tag">
                {selectedModel ? selectedModel.replace('models/', '') : '未選擇模型'}
              </span>
            </div>
          </div>

          <div className="header-status">
            {apiKey ? '🟢 已設定 API Key' : '🔴 尚未設定 API Key'}
          </div>
        </header>

        {/* Message Stream */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
        />

        {/* User Input controls */}
        <InputArea
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={!apiKey.trim() || !selectedModel}
        />
      </main>
    </div>
  );
}
