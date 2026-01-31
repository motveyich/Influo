import React, { useState } from 'react';
import { X, Sparkles, MessageSquare, FileText, Loader2 } from 'lucide-react';

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

export const SimpleAIAssistant: React.FC<SimpleAIAssistantProps> = ({
  isOpen,
  onClose,
  currentMessageText,
  onInsertText,
  onAIRequest
}) => {
  const [activeTab, setActiveTab] = useState<'check' | 'suggest' | 'status'>('check');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleRequest = async (type: 'check' | 'suggest' | 'status') => {
    setLoading(true);
    setError('');
    setResponse('');
    setActiveTab(type);

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
      setResponse(result);
    } catch (err: any) {
      setError(err.message || 'Не удалось получить ответ');
    } finally {
      setLoading(false);
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

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-sm">AI Помощник</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => handleRequest('check')}
          disabled={loading || !currentMessageText.trim()}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'check'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          } ${!currentMessageText.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-center space-x-1">
            <MessageSquare className="w-4 h-4" />
            <span>Проверить</span>
          </div>
        </button>

        <button
          onClick={() => handleRequest('suggest')}
          disabled={loading}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'suggest'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-1">
            <Sparkles className="w-4 h-4" />
            <span>Варианты</span>
          </div>
        </button>

        <button
          onClick={() => handleRequest('status')}
          disabled={loading}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'status'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center space-x-1">
            <FileText className="w-4 h-4" />
            <span>Статус</span>
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-[200px] max-h-[300px]">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-sm text-gray-500">Анализирую...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && !response && (
          <div className="flex items-center justify-center h-full text-center">
            <div className="text-gray-400 text-sm space-y-2">
              {activeTab === 'check' && (
                <>
                  <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                  <p>Проверит введенное сообщение на деловой стиль</p>
                  <p className="text-xs">Введите текст и нажмите "Проверить"</p>
                </>
              )}
              {activeTab === 'suggest' && (
                <>
                  <Sparkles className="w-8 h-8 mx-auto mb-2" />
                  <p>Предложит варианты ответа на последнее сообщение</p>
                  <p className="text-xs">Нажмите "Варианты" для анализа</p>
                </>
              )}
              {activeTab === 'status' && (
                <>
                  <FileText className="w-8 h-8 mx-auto mb-2" />
                  <p>Покажет статус диалога и договоренности</p>
                  <p className="text-xs">Нажмите "Статус" для анализа</p>
                </>
              )}
            </div>
          </div>
        )}

        {!loading && !error && response && (
          <div className="space-y-3">
            {activeTab === 'check' && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 text-sm">{response}</div>
              </div>
            )}

            {activeTab === 'suggest' && (
              <div className="space-y-2">
                {extractSuggestions(response).map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 border border-gray-200 rounded-md p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onInsertText(suggestion)}
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
                      <button
                        className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
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

            {activeTab === 'status' && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 text-sm">{response}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && response && activeTab === 'check' && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Совет от AI. Решение остается за вами.
          </p>
        </div>
      )}
    </div>
  );
};
