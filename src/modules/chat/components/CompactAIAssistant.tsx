import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../../core/types';
import { Bot, Sparkles, AlertTriangle, MessageSquarePlus, TrendingUp, Copy, X, Loader2, CheckCheck } from 'lucide-react';
import { aiAssistantService } from '../services/aiAssistantService';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface CompactAIAssistantProps {
  messages: ChatMessage[];
  conversationId: string;
  onInsertText: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type ActionType = 'summary' | 'risks' | 'suggest_reply' | 'next_steps' | null;

export function CompactAIAssistant({
  messages,
  conversationId,
  onInsertText,
  isOpen,
  onClose
}: CompactAIAssistantProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<ActionType>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [messageToImprove, setMessageToImprove] = useState('');
  const [showImproveInput, setShowImproveInput] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setAiResponse('');
      setCurrentAction(null);
      setShowImproveInput(false);
      setMessageToImprove('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = async (action: ActionType) => {
    if (messages.length === 0) {
      toast.error('Нет сообщений для анализа');
      return;
    }

    setLoading(true);
    setCurrentAction(action);
    setAiResponse('');
    setShowImproveInput(false);

    try {
      let response = '';

      switch (action) {
        case 'summary':
          response = await aiAssistantService.getSummary(messages, conversationId);
          break;
        case 'risks':
          response = await aiAssistantService.analyzeRisks(messages, conversationId);
          break;
        case 'suggest_reply':
          response = await aiAssistantService.suggestReply(messages, conversationId);
          break;
        case 'next_steps':
          response = await aiAssistantService.suggestNextSteps(messages, conversationId);
          break;
      }

      setAiResponse(response);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при обращении к AI');
      setAiResponse('');
      setCurrentAction(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImproveMessage = async () => {
    if (!messageToImprove.trim()) {
      toast.error('Введите текст для улучшения');
      return;
    }

    setLoading(true);
    setCurrentAction('next_steps');

    try {
      const response = await aiAssistantService.improveMessage(messages, conversationId, messageToImprove);
      setAiResponse(response);
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при обращении к AI');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToInput = (text: string) => {
    onInsertText(text);
    toast.success('Текст вставлен в поле ввода');
  };

  const parseListResponse = (response: string): string[] => {
    const lines = response.split('\n').filter(line => line.trim());
    return lines.map(line => line.replace(/^[\d\.\-\*]\s*/, '').trim()).filter(Boolean);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50"
      style={{ maxHeight: '30vh', minHeight: '200px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bot className="w-4 h-4" />
          <div>
            <h3 className="font-semibold text-sm">AI-Помощник</h3>
            <p className="text-xs text-blue-100">
              {messages.length} сообщений в диалоге
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-blue-200 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      {!currentAction && !showImproveInput && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-gray-600 mb-2">Выберите действие:</p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleAction('summary')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors border border-blue-200"
            >
              <CheckCheck className="w-4 h-4" />
              Сводка
            </button>

            <button
              onClick={() => handleAction('risks')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition-colors border border-orange-200"
            >
              <AlertTriangle className="w-4 h-4" />
              Риски
            </button>

            <button
              onClick={() => handleAction('suggest_reply')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors border border-green-200"
            >
              <MessageSquarePlus className="w-4 h-4" />
              Варианты ответа
            </button>

            <button
              onClick={() => handleAction('next_steps')}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium transition-colors border border-purple-200"
            >
              <TrendingUp className="w-4 h-4" />
              Что делать
            </button>
          </div>

          <button
            onClick={() => setShowImproveInput(true)}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-medium transition-colors border border-gray-200"
          >
            <Sparkles className="w-4 h-4" />
            Улучшить мой текст
          </button>
        </div>
      )}

      {/* Improve Message Input */}
      {showImproveInput && !currentAction && (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">Введите текст для улучшения:</p>
            <button
              onClick={() => {
                setShowImproveInput(false);
                setMessageToImprove('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={messageToImprove}
            onChange={(e) => setMessageToImprove(e.target.value)}
            placeholder="Например: Привет, давайте обсудим условия..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            autoFocus
          />

          <button
            onClick={handleImproveMessage}
            disabled={loading || !messageToImprove.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Улучшаю...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Улучшить
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && currentAction && (
        <div className="p-6 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
          <p className="text-sm text-gray-600">AI анализирует диалог...</p>
        </div>
      )}

      {/* AI Response */}
      {!loading && aiResponse && currentAction && (
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(30vh - 120px)' }}>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">
                {currentAction === 'summary' && 'Сводка договоренностей'}
                {currentAction === 'risks' && 'Возможные риски'}
                {currentAction === 'suggest_reply' && 'Варианты ответов'}
                {currentAction === 'next_steps' && 'Рекомендуемые шаги'}
              </p>
              <button
                onClick={() => {
                  setCurrentAction(null);
                  setAiResponse('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Parse and display response */}
            {(currentAction === 'suggest_reply' || currentAction === 'next_steps') ? (
              <div className="space-y-2">
                {parseListResponse(aiResponse).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                  >
                    <span className="text-sm text-gray-900 flex-1">{item}</span>
                    {currentAction === 'suggest_reply' && (
                      <button
                        onClick={() => handleCopyToInput(item)}
                        className="text-gray-400 group-hover:text-blue-600 flex-shrink-0"
                        title="Вставить в поле ввода"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {aiResponse}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-1.5">
        <p className="text-xs text-gray-500 text-center">
          Работает на DeepSeek AI • Ответы сохраняются в кэше
        </p>
      </div>
    </div>
  );
}
