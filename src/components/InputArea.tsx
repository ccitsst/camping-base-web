import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, Mic, Volume2, Square, X, Music, Languages, Image, FileText
} from 'lucide-react';
import type { Attachment } from '../types';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isLoading: boolean;
  disabled: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading, disabled }) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isDictating, setIsDictating] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'stt' | 'audio'>('stt'); // stt = speech-to-text, audio = direct recording
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileAccept, setFileAccept] = useState('image/*,audio/*');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea as text grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  // Clean up recording timers and recognition on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  // Timer for audio recording
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setRecordingSeconds(0);
    }
  }, [isRecording]);

  // Handle clicking outside to close attachment menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format recording duration (e.g. 0:05)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<{ base64: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, dataUrl });
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const filesArray = Array.from(e.target.files);
    const newAttachments: Attachment[] = [];

    for (const file of filesArray) {
      try {
        const { base64, dataUrl } = await fileToBase64(file);
        newAttachments.push({
          name: file.name,
          type: file.type || 'application/octet-stream',
          dataUrl,
          base64,
        });
      } catch (err) {
        console.error('Error reading file:', file.name, err);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowAttachMenu(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = (acceptType: string) => {
    setFileAccept(acceptType);
    setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 50);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText && attachments.length === 0) return;
    if (isLoading || disabled) return;

    onSendMessage(trimmedText, attachments);
    setText('');
    setAttachments([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ================= SPEECH-TO-TEXT (STT) =================
  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('您的瀏覽器不支援 Web Speech API 語音辨識。請使用 Chrome 或 Safari 瀏覽器。');
      return;
    }

    if (isDictating) {
      stopSpeechRecognition();
      return;
    }

    setIsDictating(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'zh-TW';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setText(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsDictating(false);
  };

  // ================= DIRECT AUDIO RECORDING =================
  const startRecording = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const timeStamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `錄音檔_${timeStamp}.webm`;

        const file = new File([audioBlob], filename, { type: 'audio/webm' });
        try {
          const { base64, dataUrl } = await fileToBase64(file);
          setAttachments(prev => [
            ...prev,
            {
              name: filename,
              type: 'audio/webm',
              dataUrl,
              base64,
            }
          ]);
        } catch (err) {
          console.error('Error reading recorded audio:', err);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      setIsRecording(true);
      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to get microphone permissions:', err);
      alert('無法開啟麥克風權限，請確認瀏覽器已允許使用麥克風。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  return (
    <div className="input-area-container">
      <div className="input-area-inner">
        
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="input-attachments-list">
            {attachments.map((att, idx) => {
              const isImage = att.type.startsWith('image/');
              
              return (
                <div key={idx} className="input-attachment-chip">
                  {isImage ? (
                    <img src={att.dataUrl} alt="preview" className="input-attachment-thumbnail" />
                  ) : att.type.startsWith('audio/') ? (
                    <Music style={{ width: '16px', height: '16px', color: 'var(--accent-primary)', flexShrink: 0 }} />
                  ) : (
                    <Paperclip style={{ width: '14px', height: '14px', color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                  <span className="input-attachment-name">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    className="btn-remove-attachment"
                  >
                    <X style={{ width: '14px', height: '14px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Bar Form */}
        <form onSubmit={handleSubmit} className="input-row-form" style={{ position: 'relative' }}>
          
          {/* File input trigger button */}
          <div ref={attachMenuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={isLoading || disabled}
              className="btn-attach-file"
              title="附加檔案"
            >
              <Paperclip style={{ width: '20px', height: '20px' }} />
            </button>

            {/* Premium Attachment Menu Dropdown */}
            {showAttachMenu && (
              <div className="attach-menu">
                <button 
                  type="button" 
                  onClick={() => triggerFileInput('image/*')} 
                  className="attach-menu-item"
                >
                  <Image style={{ width: '16px', height: '16px', color: 'var(--accent-primary)', flexShrink: 0 }} />
                  上傳圖片
                </button>
                <button 
                  type="button" 
                  onClick={() => triggerFileInput('audio/*')} 
                  className="attach-menu-item"
                >
                  <Music style={{ width: '16px', height: '16px', color: 'var(--accent-secondary)', flexShrink: 0 }} />
                  上傳音訊
                </button>
                <button 
                  type="button" 
                  onClick={() => triggerFileInput('application/pdf,text/*,application/json,application/vnd.openxmlformats-officedocument.*,application/msword')} 
                  className="attach-menu-item"
                >
                  <FileText style={{ width: '16px', height: '16px', color: 'var(--text-muted)', flexShrink: 0 }} />
                  上傳文件 (PDF/TXT等)
                </button>
              </div>
            )}
          </div>
          
          {/* Hidden HTML File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept={fileAccept}
            style={{ display: 'none' }}
          />

          {/* Text Input area */}
          <div className="textarea-container">
            {isRecording ? (
              // Audio Recording UI overlay
              <div className="recording-overlay">
                <div className="recording-status">
                  <span className="recording-dot-pulse recording-pulse"></span>
                  <span>語音錄音中 ({formatTime(recordingSeconds)}) ...</span>
                </div>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="btn-stop-recording"
                >
                  <Square style={{ width: '12px', height: '12px', fill: 'currentColor' }} />
                  停止並完成
                </button>
              </div>
            ) : (
              // Text Area
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isDictating ? '語音聽寫中...' : '輸入訊息...'}
                rows={1}
                disabled={isLoading || disabled || isDictating}
                className="input-textarea"
              />
            )}

            {/* Dictating pulsing overlay */}
            {isDictating && (
              <button
                type="button"
                onClick={stopSpeechRecognition}
                className="btn-stop-dictation recording-pulse"
                title="停止聽寫"
              >
                <Square style={{ width: '14px', height: '14px', fill: 'currentColor' }} />
              </button>
            )}
          </div>

          {/* Voice Input Action Button */}
          {!isRecording && !isDictating && (
            <div className="voice-panel-controls">
              
              {/* Voice Mode Selector Toggle */}
              <button
                type="button"
                onClick={() => setVoiceMode(prev => prev === 'stt' ? 'audio' : 'stt')}
                className="btn-voice-toggle"
                title={voiceMode === 'stt' ? '切換為: 麥克風錄音檔直接發送' : '切換為: 語音即時聽寫轉文字'}
              >
                {voiceMode === 'stt' ? (
                  <Languages style={{ width: '16px', height: '16px' }} />
                ) : (
                  <Volume2 style={{ width: '16px', height: '16px' }} />
                )}
              </button>

              {/* Mic Activation Button */}
              <button
                type="button"
                onClick={voiceMode === 'stt' ? startSpeechRecognition : startRecording}
                disabled={isLoading || disabled}
                className="btn-voice-activate"
                title={voiceMode === 'stt' ? '語音聽寫 (轉文字)' : '語音錄音 (直接傳送錄音)'}
              >
                <Mic style={{ width: '18px', height: '18px' }} />
              </button>
            </div>
          )}

          {/* Send Message Button */}
          <button
            type="submit"
            disabled={isLoading || disabled || (!text.trim() && attachments.length === 0)}
            className="btn-submit-message"
            title="發送訊息"
          >
            <Send style={{ width: '20px', height: '20px' }} />
          </button>
        </form>

        {/* Small tips */}
        <div className="input-footer-row">
          <div>
            輸入模式：{voiceMode === 'stt' ? '🎙️ 語音聽寫 (轉文字)' : '🎵 錄音上傳 (送給 Gemini)'}
          </div>
          <div>
            Shift + Enter 換行
          </div>
        </div>

      </div>
    </div>
  );
};
