import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { InputArea } from './components/InputArea';
import type { Message, Attachment } from './types';
import { streamGeminiChat, formatErrorMessage } from './services/GeminiService';
import { Menu, Sparkles } from 'lucide-react';

const DEFAULT_SYSTEM_PROMPT = 
  '你是一位溫慢親切、專業有禮的 AI 智慧語音助理。請預設使用繁體中文（zh-TW）與 Markdown 格式回答使用者的問題。對於程式碼，請標記正確語言並提供高亮區塊；對於數學公式或表格，請提供完美的 Markdown 排版，讓畫面看起來輕鬆舒適且易於閱讀。';

export default function App() {
  // --- Settings & Chat History States ---
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('web_ai_agent_api_key') || '';
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
