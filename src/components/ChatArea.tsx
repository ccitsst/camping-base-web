import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Music, FileText, Sparkles } from 'lucide-react';
import type { Message } from '../types';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-area-container">
      {messages.length === 0 ? (
        // Welcoming Empty State
        <div className="welcome-splash">
          <div className="welcome-icon-box">
            <Sparkles style={{ width: '40px', height: '40px', color: 'var(--accent-primary)' }} />
          </div>
          <div>
            <h1 className="welcome-title">歡迎使用 Web AI Agent !</h1>
            <p className="welcome-desc" style={{ marginTop: '8px' }}>
              這是一個基於 Gemini API 的智慧助理。您可以輸入文字問題、上傳圖片或檔案，或者使用語音功能進行交流。
            </p>
          </div>
          <div className="welcome-tips-card">
            <p className="welcome-tips-title">
              <Sparkles style={{ width: '14px', height: '14px', color: 'var(--accent-primary)' }} />
              開始前的快速設定：
            </p>
            <ol className="welcome-tips-list">
              <li>於左側設定面板輸入您的 <b>Gemini API Key</b></li>
              <li>點擊重新整理載入模型，並選擇合適的語言模型</li>
              <li>在下方對話框輸入訊息或點擊語音按鈕開始對談！</li>
            </ol>
          </div>
        </div>
      ) : (
        // Message List
        <div className="chat-area-inner">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            
            return (
              <div 
                key={message.id} 
                className={`message-row ${isUser ? 'user-row' : ''}`}
              >
                {/* Avatar */}
                <div className={`message-avatar-box ${isUser ? 'user-avatar' : 'model-avatar'}`}>
                  {isUser ? 
                    <User style={{ width: '20px', height: '20px' }} /> : 
                    <Bot style={{ width: '20px', height: '20px' }} />
                  }
                </div>

                {/* Message Bubble Column */}
                <div className="message-bubble-col">
                  {/* Timestamp & Name */}
                  <div className="message-meta">
                    <span className="message-meta-name">{isUser ? '您' : 'AI 助理'}</span>
                    <span>•</span>
                    <span>{formatTime(message.timestamp)}</span>
                  </div>

                  {/* Bubble Content */}
                  <div className={`message-bubble ${isUser ? 'user-bubble' : 'model-bubble'}`}>
                    
                    {/* Render Attachments if any */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="message-attachments">
                        {message.attachments.map((att, idx) => {
                          const isImage = att.type.startsWith('image/');
                          const isAudio = att.type.startsWith('audio/');
                          
                          if (isImage) {
                            return (
                              <div key={idx} className="attachment-img-preview">
                                <img src={att.dataUrl} alt={att.name} />
                              </div>
                            );
                          } else if (isAudio) {
                            return (
                              <div key={idx} className="attachment-audio-card">
                                <Music style={{ width: '20px', height: '20px', color: 'var(--accent-primary)', flexShrink: 0 }} />
                                <div className="attachment-audio-details">
                                  <span className="attachment-audio-name">{att.name}</span>
                                  <audio src={att.dataUrl} controls className="attachment-audio-player" />
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <div key={idx} className="attachment-generic-card">
                                <FileText style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                                <div>
                                  <span className="attachment-audio-name" style={{ display: 'block' }}>{att.name}</span>
                                  <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>檔案</span>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}

                    {/* Message Body (Markdown) */}
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>

                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message-row">
              <div className="message-avatar-box model-avatar">
                <Bot style={{ width: '20px', height: '20px' }} />
              </div>
              <div className="message-bubble-col">
                <div className="message-meta">
                  <span className="message-meta-name">AI 助理</span>
                  <span>•</span>
                  <span style={{ fontStyle: 'italic' }}>正在輸入中...</span>
                </div>
                <div className="typing-bubble">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};
