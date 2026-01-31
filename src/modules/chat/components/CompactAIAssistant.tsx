import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../../core/types';
import { Bot, Sparkles, AlertTriangle, CheckCircle, Copy, X, Zap, MessageSquare, TrendingUp } from 'lucide-react';
import { aiLocalRules, ConversationAnalysis, LocalAISuggestion } from '../services/aiLocalRules';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface CompactAIAssistantProps {
  messages: ChatMessage[];
  currentUserId: string;
  onInsertText: (text: string) => void;
  onRequestDeepSeek?: (prompt: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CompactAIAssistant({
  messages,
  currentUserId,
  onInsertText,
  onRequestDeepSeek,
  isOpen,
  onClose
}: CompactAIAssistantProps) {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'summary' | 'replies'>('suggestions');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const newAnalysis = aiLocalRules.analyzeConversation(messages, currentUserId);
      setAnalysis(newAnalysis);
    }
  }, [isOpen, messages, currentUserId]);

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

  if (!isOpen || !analysis) return null;

  const handleCopy = (text: string) => {
    onInsertText(text);
    toast.success('Текст вставлен в поле ввода');
  };

  const handleDeepSeekRequest = (type: 'summary' | 'risks' | 'improve') => {
    if (!onRequestDeepSeek) {
      toast.error('DeepSeek интеграция недоступна');
      return;
    }

    let prompt = '';
    switch (type) {
      case 'summary':
        prompt = 'Дай краткую сводку всех договоренностей из этого диалога';
        break;
      case 'risks':
        prompt = 'Проанализируй риски и что может пойти не так в этой сделке';
        break;
      case 'improve':
        prompt = 'Как улучшить мой следующий ответ, чтобы быть более убедительным?';
        break;
    }

    onRequestDeepSeek(prompt);
    toast.success('Запрос отправлен в DeepSeek');
  };

  const getSuggestionIcon = (type: LocalAISuggestion['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'checklist':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'tip':
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSuggestionBgColor = (type: LocalAISuggestion['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-orange-50 border-orange-200';
      case 'checklist':
        return 'bg-green-50 border-green-200';
      case 'tip':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
      style={{ maxHeight: '60vh', minHeight: '300px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <div>
              <h3 className="font-semibold text-sm">AI-Помощник</h3>
              <p className="text-xs text-blue-100">
                {analysis.stage === 'initial' && 'Начало диалога'}
                {analysis.stage === 'negotiation' && 'Обсуждение условий'}
                {analysis.stage === 'active' && 'Сотрудничество'}
                {analysis.stage === 'completion' && 'Завершение'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{analysis.messageCount} сообщений</span>
          </div>
          {analysis.hasAgreement && (
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Есть согласие</span>
            </div>
          )}
          {analysis.risks.length > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{analysis.risks.length} риск(ов)</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'suggestions'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-3 h-3 inline mr-1" />
          Подсказки
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'replies'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MessageSquare className="w-3 h-3 inline mr-1" />
          Шаблоны
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'summary'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TrendingUp className="w-3 h-3 inline mr-1" />
          Анализ
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '40vh' }}>
        {activeTab === 'suggestions' && (
          <div className="p-3 space-y-2">
            {analysis.suggestions.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>Пока нет подсказок</p>
              </div>
            ) : (
              analysis.suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg p-3 ${getSuggestionBgColor(suggestion.type)}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getSuggestionIcon(suggestion.type)}
                      <span className="text-xs font-semibold text-gray-900">
                        {suggestion.title}
                      </span>
                    </div>
                    {suggestion.type === 'template' && (
                      <button
                        onClick={() => handleCopy(suggestion.content)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Вставить в поле ввода"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">
                    {suggestion.content}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'replies' && (
          <div className="p-3 space-y-2">
            {aiLocalRules.getQuickReplies(analysis.stage).map((reply, idx) => (
              <button
                key={idx}
                onClick={() => handleCopy(reply)}
                className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{reply}</span>
                  <Copy className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="p-3 space-y-3">
            {/* Missing Elements */}
            {analysis.missingElements.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-900">
                    Не обсуждено
                  </span>
                </div>
                <ul className="text-xs text-yellow-800 space-y-1">
                  {analysis.missingElements.map((element, idx) => (
                    <li key={idx}>• {element}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {analysis.risks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-900">
                    Возможные риски
                  </span>
                </div>
                <ul className="text-xs text-red-800 space-y-1">
                  {analysis.risks.map((risk, idx) => (
                    <li key={idx}>• {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-xs font-semibold text-green-900">
                  Обсуждено
                </span>
              </div>
              <div className="text-xs text-green-800 space-y-1">
                {analysis.hasAgreement && <div>✓ Договоренности зафиксированы</div>}
                {analysis.hasPriceDiscussion && <div>✓ Обсуждена цена</div>}
                {analysis.hasDeadline && <div>✓ Указаны сроки</div>}
                {analysis.hasDeliverables && <div>✓ Определены задачи</div>}
                {!analysis.hasAgreement && !analysis.hasPriceDiscussion && !analysis.hasDeadline && !analysis.hasDeliverables && (
                  <div className="text-gray-500">Пока ничего не обсуждено</div>
                )}
              </div>
            </div>

            {/* DeepSeek Actions */}
            {onRequestDeepSeek && (
              <div className="border-t border-gray-200 pt-3">
                <p className="text-xs text-gray-600 mb-2">Глубокий анализ с DeepSeek:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDeepSeekRequest('summary')}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3 h-3" />
                    Сводка
                  </button>
                  <button
                    onClick={() => handleDeepSeekRequest('risks')}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Риски
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-xs text-gray-500 text-center">
          AI работает локально • токены не тратятся
        </p>
      </div>
    </div>
  );
}
