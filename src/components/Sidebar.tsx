import React, { useState, useEffect } from 'react';
import { 
  Settings, Key, Bot, MessageSquare, Trash2, RefreshCw, Eye, EyeOff, X, Sparkles, Globe 
} from 'lucide-react';
import { fetchModels } from '../services/GeminiService';

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  useProxy: boolean;
  setUseProxy: (val: boolean) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  onClearHistory: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  useProxy,
  setUseProxy,
  systemPrompt,
  setSystemPrompt,
  selectedModel,
  setSelectedModel,
  onClearHistory,
  isOpen,
  onClose,
}) => {
  const [models, setModels] = useState<{ name: string; displayName: string }[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Auto-fetch models when API Key, Base URL or proxy switch changes
  useEffect(() => {
    if (apiKey.trim()) {
      handleLoadModels();
    } else {
      setModels([]);
    }
  }, [apiKey, baseUrl, useProxy]);

  const handleLoadModels = async () => {
    if (!apiKey.trim()) {
      setModelError('請先輸入 API Key');
      return;
    }
    
    setIsLoadingModels(true);
    setModelError('');
    try {
      // If useProxy is false, pass an empty string for baseUrl to connect directly to Google's API
      const fetched = await fetchModels(apiKey.trim(), useProxy ? baseUrl.trim() : '');
      setModels(fetched);
      
      // If the currently selected model is not in the list, set it to the first available one
      if (fetched.length > 0) {
        const match = fetched.find(m => m.name === selectedModel);
        if (!match) {
          setSelectedModel(fetched[0].name);
        }
      }
    } catch (err: any) {
      console.error(err);
      setModelError(err.message || '無法獲取模型列表，請檢查金鑰與代理設定。');
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="sidebar-backdrop"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Sparkles style={{ width: '20px', height: '20px', color: 'var(--accent-primary)' }} />
            <span className="sidebar-logo-text">Web AI Agent</span>
          </div>
          <button 
            onClick={onClose} 
            className="btn-sidebar-close"
            title="關閉選單"
          >
            <X style={{ width: '20px', height: '20px' }} />
          </button>
        </div>

        {/* Sidebar Scrollable Body */}
        <div className="sidebar-body">
          
          {/* Settings Section */}
          <div className="settings-section">
            <div className="section-title">
              <Settings style={{ width: '16px', height: '16px', color: 'var(--accent-primary)' }} />
              參數設定
            </div>

            {/* API Key */}
            <div className="input-group">
              <div className="input-label-row">
                <label className="input-label">
                  <Key style={{ width: '14px', height: '14px' }} />
                  Gemini API Key
                </label>
                <a 
                  href="https://aistudio.google.com/app/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="label-link"
                >
                  取得金鑰
                </a>
              </div>
              <div className="input-password-wrapper">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy... 或代理金鑰"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="input-password-toggle"
                >
                  {showApiKey ? 
                    <EyeOff style={{ width: '16px', height: '16px' }} /> : 
                    <Eye style={{ width: '16px', height: '16px' }} />
                  }
                </button>
              </div>
              <p className="input-hint">金鑰與代理網址僅存於本機 localStorage。</p>
            </div>

            {/* API Proxy Toggle & Input */}
            <div className="input-group" style={{ gap: '8px' }}>
              <div className="input-label-row">
                <span className="input-label">
                  <Globe style={{ width: '14px', height: '14px' }} />
                  使用 API 代理服務
                </span>
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                />
              </div>

              {useProxy && (
                <div style={{ marginTop: '2px', animation: 'fadeIn 0.2s ease' }}>
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://gemini.printii.com"
                  />
                  <p className="input-hint">預設為課程中介代理網址。</p>
                </div>
              )}
            </div>

            {/* Model Selection */}
            <div className="input-group">
              <div className="input-label-row">
                <label className="input-label">
                  <Bot style={{ width: '14px', height: '14px' }} />
                  選擇語言模型
                </label>
                <button
                  type="button"
                  disabled={isLoadingModels}
                  onClick={handleLoadModels}
                  className="btn-icon-sm"
                  title="重新整理模型"
                >
                  <RefreshCw 
                    style={{ width: '14px', height: '14px' }} 
                    className={isLoadingModels ? 'animate-spin' : ''} 
                  />
                </button>
              </div>
              
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={models.length === 0}
              >
                {models.length === 0 ? (
                  <option value="">{isLoadingModels ? '正在獲取模型...' : '請輸入 API Key 載入模型'}</option>
                ) : (
                  models.map((model) => (
                    <option key={model.name} value={model.name}>
                      {model.displayName}
                    </option>
                  ))
                )}
              </select>
              {modelError && (
                <p className="input-hint" style={{ color: '#ff4a4a', marginTop: '4px' }}>{modelError}</p>
              )}
            </div>

            {/* System Prompt */}
            <div className="input-group">
              <label className="input-label">
                <MessageSquare style={{ width: '14px', height: '14px' }} />
                系統提示詞 (System Prompt)
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="你是一位熱心、專業的 AI 助理..."
                rows={6}
              />
            </div>
          </div>
          
          <hr style={{ border: 'none', borderBottom: '1px solid var(--glass-border)' }} />
          
          {/* History Management */}
          <div className="settings-section">
            <div className="section-title">
              <MessageSquare style={{ width: '16px', height: '16px', color: 'var(--accent-primary)' }} />
              對話管理
            </div>
            
            <button
              onClick={onClearHistory}
              className="btn-clear-history"
            >
              <Trash2 style={{ width: '16px', height: '16px' }} />
              清除歷史紀錄
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          v1.2.0 • 網頁型 Gemini AI 助理
        </div>
      </aside>
    </>
  );
};
