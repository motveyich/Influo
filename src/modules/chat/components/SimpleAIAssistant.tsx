import React, { useState, useEffect } from 'react';
import { X, Sparkles, MessageSquare, FileText, Loader2, Check, AlertCircle, Copy, AlertTriangle } from 'lucide-react';
import { aiAssistantService } from '../services/aiAssistantService';

interface Message {
  content: string;
  senderId: string;
  timestamp: string;
}

interface SimpleAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  conversationId: string;
  currentUserId: string;
  currentMessageText: string;
  onInsertText: (text: string) => void;
  onAIRequest: (type: string, customPrompt?: string) => Promise<string>;
}

interface RequestState {
  loading: boolean;
  response: string | null;
  error: string | null;
  success: boolean;
}

const initialState: RequestState = {
  loading: false,
  response: null,
  error: null,
  success: false
};

export const SimpleAIAssistant: React.FC<SimpleAIAssistantProps> = ({
  isOpen,
  onClose,
  messages,
  currentMessageText,
  onInsertText,
  onAIRequest
}) => {
  const [checkState, setCheckState] = useState<RequestState>(initialState);
  const [suggestState, setSuggestState] = useState<RequestState>(initialState);
  const [statusState, setStatusState] = useState<RequestState>(initialState);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    checked: boolean;
    configured: boolean;
    message: string;
  }>({ checked: false, configured: true, message: '' });

  useEffect(() => {
    if (isOpen) {
      setCheckState(initialState);
      setSuggestState(initialState);
      setStatusState(initialState);

      checkAIConnection();
    }
  }, [isOpen]);

  const checkAIConnection = async () => {
    try {
      const result = await aiAssistantService.testConnection();
      setConnectionStatus({
        checked: true,
        configured: result.configured && result.success,
        message: result.message
      });
    } catch (error) {
      setConnectionStatus({
        checked: true,
        configured: false,
        message: 'Не удалось проверить статус AI'
      });
    }
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRequest = async (
    type: 'check' | 'suggest' | 'status',
    setState: React.Dispatch<React.SetStateAction<RequestState>>
  ) => {
    setState({ loading: true, response: null, error: null, success: false });

    try {
      let requestType: string;
      let customPrompt: string | undefined;

      switch (type) {
        case 'check':
          requestType = 'check_message';
          customPrompt = currentMessageText;
          break;
        case 'suggest':
          requestType = 'suggest_reply';
          break;
        case 'status':
          requestType = 'dialog_status';
          break;
      }

      const result = await onAIRequest(requestType, customPrompt);
      setState({ loading: false, response: result, error: null, success: true });

      setTimeout(() => {
        setState(prev => ({ ...prev, success: false }));
      }, 2000);
    } catch (err: any) {
      setState({
        loading: false,
        response: null,
        error: err.message || 'Не удалось получить ответ',
        success: false
      });
    }
  };

  const extractSuggestions = (text: string): string[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const suggestions: string[] = [];

    for (const line of lines) {
      const match = line.match(/^[1-3][\.\)]\s*(.+)/);
      if (match) {
        suggestions.push(match[1].trim());
      }
    }

    return suggestions.length > 0 ? suggestions : [text];
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const hasAnyResponse = checkState.response || suggestState.response || statusState.response;
  const hasAnyError = checkState.error || suggestState.error || statusState.error;

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-[999]"
        onClick={onClose}
      />

      <div
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-full max-w-2xl mx-auto px-4 z-[1000]"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-slideUp">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">AI Помощник</span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {connectionStatus.checked && !connectionStatus.configured && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900">DeepSeek API не настроен</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Для работы AI-помощника нужно добавить API ключ DeepSeek в переменные окружения backend.
                    Получите ключ на <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-800">platform.deepseek.com</a>
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col">
                <button
                  onClick={() => handleRequest('check', setCheckState)}
                  disabled={checkState.loading || !currentMessageText.trim()}
                  className={`
                    relative flex items-center justify-center space-x-2 px-4 py-3 rounded-lg
                    font-medium text-sm transition-all duration-200
                    ${checkState.loading
                      ? 'bg-blue-100 text-blue-600 cursor-wait'
                      : !currentMessageText.trim()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : checkState.success
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }
                  `}
                >
                  {checkState.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : checkState.success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <MessageSquare className="w-4 h-4" />
                  )}
                  <span>Проверить</span>
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center px-2">
                  Проверит ваше сообщение на деловой стиль
                </p>
              </div>

              <div className="flex flex-col">
                <button
                  onClick={() => handleRequest('suggest', setSuggestState)}
                  disabled={suggestState.loading || messages.length === 0}
                  className={`
                    relative flex items-center justify-center space-x-2 px-4 py-3 rounded-lg
                    font-medium text-sm transition-all duration-200
                    ${suggestState.loading
                      ? 'bg-blue-100 text-blue-600 cursor-wait'
                      : messages.length === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : suggestState.success
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }
                  `}
                >
                  {suggestState.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : suggestState.success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Варианты</span>
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center px-2">
                  Предложит 3 варианта ответа
                </p>
              </div>

              <div className="flex flex-col">
                <button
                  onClick={() => handleRequest('status', setStatusState)}
                  disabled={statusState.loading || messages.length < 3}
                  className={`
                    relative flex items-center justify-center space-x-2 px-4 py-3 rounded-lg
                    font-medium text-sm transition-all duration-200
                    ${statusState.loading
                      ? 'bg-blue-100 text-blue-600 cursor-wait'
                      : messages.length < 3
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : statusState.success
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }
                  `}
                >
                  {statusState.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : statusState.success ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>Статус</span>
                </button>
                <p className="text-xs text-gray-500 mt-1 text-center px-2">
                  Покажет договоренности и открытые вопросы
                </p>
              </div>
            </div>

            {!hasAnyResponse && !hasAnyError && (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  Выберите действие для работы с AI
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Каждая функция анализирует ваш диалог независимо
                </p>
              </div>
            )}

            <div
              className="space-y-3 overflow-y-auto transition-all duration-300"
              style={{
                maxHeight: hasAnyResponse || hasAnyError ? '400px' : '0px',
                opacity: hasAnyResponse || hasAnyError ? 1 : 0
              }}
            >
              {checkState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Ошибка проверки</p>
                    <p className="text-sm text-red-600 mt-1">{checkState.error}</p>
                  </div>
                </div>
              )}

              {checkState.response && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">Проверка сообщения</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(checkState.response!, 0)}
                      className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                      title="Скопировать"
                    >
                      {copiedIndex === 0 ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {checkState.response}
                  </div>
                </div>
              )}

              {suggestState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Ошибка генерации вариантов</p>
                    <p className="text-sm text-red-600 mt-1">{suggestState.error}</p>
                  </div>
                </div>
              )}

              {suggestState.response && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center space-x-2 mb-3">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Варианты ответа</span>
                  </div>
                  {extractSuggestions(suggestState.response).map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => onInsertText(suggestion)}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-gray-700 flex-1 leading-relaxed group-hover:text-gray-900 transition-colors">
                          {suggestion}
                        </p>
                        <button
                          className="ml-3 px-3 py-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap bg-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertText(suggestion);
                          }}
                        >
                          Вставить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {statusState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Ошибка анализа статуса</p>
                    <p className="text-sm text-red-600 mt-1">{statusState.error}</p>
                  </div>
                </div>
              )}

              {statusState.response && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-900">Статус диалога</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(statusState.response!, 1)}
                      className="text-green-600 hover:text-green-700 p-1 rounded transition-colors"
                      title="Скопировать"
                    >
                      {copiedIndex === 1 ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                    {statusState.response}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              AI анализирует только текущий диалог. Все решения принимаете вы.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </>
  );
};
