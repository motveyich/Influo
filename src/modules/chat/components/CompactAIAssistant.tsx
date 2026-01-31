import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, CollaborationOffer } from '../../../core/types';
import { Bot, Sparkles, AlertTriangle, MessageSquarePlus, TrendingUp, Copy, X, Loader2, CheckCheck, ClipboardCheck, MessageCircle, FileText } from 'lucide-react';
import { aiAssistantService, DealStage } from '../services/aiAssistantService';
import { useTranslation } from '../../../hooks/useTranslation';
import { supabase } from '../../../core/supabase';
import toast from 'react-hot-toast';

interface CompactAIAssistantProps {
  messages: ChatMessage[];
  conversationId: string;
  onInsertText: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type ActionType =
  | 'summary'
  | 'risks'
  | 'suggest_reply'
  | 'next_steps'
  | 'check_message'
  | 'suggest_first_message'
  | 'checklist'
  | 'formulate_neutral'
  | 'review_help'
  | null;

interface StageInfo {
  name: string;
  color: string;
  bgColor: string;
}

const stageInfoMap: Record<DealStage, StageInfo> = {
  pre_contact: { name: 'Первый контакт', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  initial_contact: { name: 'Начало диалога', color: 'text-green-700', bgColor: 'bg-green-100' },
  negotiation: { name: 'Обсуждение условий', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  decision: { name: 'Принятие решения', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  collaboration: { name: 'Сотрудничество', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  near_completion: { name: 'Близится завершение', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  completion: { name: 'Завершение', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  unknown: { name: 'Диалог', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

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
  const [messageToProcess, setMessageToProcess] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputType, setTextInputType] = useState<'improve' | 'check' | 'neutral'>('improve');
  const [dealStage, setDealStage] = useState<DealStage>('unknown');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      determineDealStage();
    }
  }, [isOpen, conversationId, messages.length]);

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
      setShowTextInput(false);
      setMessageToProcess('');
    }
  }, [isOpen]);

  const determineDealStage = async () => {
    try {
      const [senderId, receiverId] = conversationId.split('_');
      if (!senderId || !receiverId) {
        setDealStage('unknown');
        return;
      }

      const { data: offer } = await supabase
        .from('offers')
        .select('status')
        .or(`and(influencer_id.eq.${senderId},advertiser_id.eq.${receiverId}),and(influencer_id.eq.${receiverId},advertiser_id.eq.${senderId})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!offer) {
        setDealStage(messages.length <= 5 ? 'pre_contact' : 'initial_contact');
        return;
      }

      const statusMap: Record<string, DealStage> = {
        'pending': 'negotiation',
        'counter': 'negotiation',
        'accepted': 'decision',
        'in_progress': 'collaboration',
        'pending_completion': 'near_completion',
        'completed': 'completion',
      };

      setDealStage(statusMap[offer.status] || 'unknown');
    } catch (error) {
      console.error('Error determining deal stage:', error);
      setDealStage('unknown');
    }
  };

  if (!isOpen) return null;

  const handleAction = async (action: ActionType) => {
    if (messages.length === 0 && action !== 'suggest_first_message') {
      toast.error('Нет сообщений для анализа');
      return;
    }

    setLoading(true);
    setCurrentAction(action);
    setAiResponse('');
    setShowTextInput(false);

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
        case 'suggest_first_message':
          response = await aiAssistantService.suggestFirstMessage(messages, conversationId);
          break;
        case 'checklist':
          response = await aiAssistantService.getChecklist(messages, conversationId);
          break;
        case 'review_help':
          response = await aiAssistantService.getReviewHelp(messages, conversationId);
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

  const handleTextProcessing = async () => {
    if (!messageToProcess.trim()) {
      toast.error('Введите текст');
      return;
    }

    setLoading(true);
    setCurrentAction('suggest_reply');

    try {
      let response = '';
      if (textInputType === 'improve') {
        response = await aiAssistantService.improveMessage(messages, conversationId, messageToProcess);
      } else if (textInputType === 'check') {
        response = await aiAssistantService.checkMessage(messages, conversationId, messageToProcess);
      } else if (textInputType === 'neutral') {
        response = await aiAssistantService.formulateNeutral(messages, conversationId, messageToProcess);
      }
      setAiResponse(response);
      setShowTextInput(false);
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

  const getActionsForStage = (): { action: ActionType; label: string; icon: any; color: string }[] => {
    const baseActions = {
      pre_contact: [
        { action: 'suggest_first_message' as ActionType, label: 'Первое сообщение', icon: MessageCircle, color: 'blue' },
        { action: null, label: 'Проверить текст', icon: ClipboardCheck, color: 'green', onClick: () => { setTextInputType('check'); setShowTextInput(true); } },
      ],
      initial_contact: [
        { action: 'suggest_reply' as ActionType, label: 'Варианты ответа', icon: MessageSquarePlus, color: 'green' },
        { action: 'next_steps' as ActionType, label: 'Что спросить', icon: TrendingUp, color: 'purple' },
        { action: null, label: 'Проверить текст', icon: ClipboardCheck, color: 'gray', onClick: () => { setTextInputType('check'); setShowTextInput(true); } },
      ],
      negotiation: [
        { action: 'summary' as ActionType, label: 'Сводка', icon: CheckCheck, color: 'blue' },
        { action: 'risks' as ActionType, label: 'Риски', icon: AlertTriangle, color: 'orange' },
        { action: 'suggest_reply' as ActionType, label: 'Варианты ответа', icon: MessageSquarePlus, color: 'green' },
        { action: null, label: 'Улучшить текст', icon: Sparkles, color: 'gray', onClick: () => { setTextInputType('improve'); setShowTextInput(true); } },
      ],
      decision: [
        { action: 'checklist' as ActionType, label: 'Чеклист', icon: ClipboardCheck, color: 'purple' },
        { action: 'summary' as ActionType, label: 'Финальная сводка', icon: CheckCheck, color: 'blue' },
        { action: 'next_steps' as ActionType, label: 'Что уточнить', icon: TrendingUp, color: 'orange' },
      ],
      collaboration: [
        { action: 'suggest_reply' as ActionType, label: 'Варианты ответа', icon: MessageSquarePlus, color: 'green' },
        { action: 'next_steps' as ActionType, label: 'Что делать дальше', icon: TrendingUp, color: 'purple' },
        { action: null, label: 'Нейтрально', icon: MessageCircle, color: 'gray', onClick: () => { setTextInputType('neutral'); setShowTextInput(true); } },
      ],
      near_completion: [
        { action: 'suggest_reply' as ActionType, label: 'Варианты ответа', icon: MessageSquarePlus, color: 'green' },
        { action: 'next_steps' as ActionType, label: 'Что делать', icon: TrendingUp, color: 'purple' },
      ],
      completion: [
        { action: 'review_help' as ActionType, label: 'Помощь с отзывом', icon: FileText, color: 'blue' },
        { action: 'suggest_reply' as ActionType, label: 'Завершающее сообщение', icon: MessageSquarePlus, color: 'green' },
      ],
      unknown: [
        { action: 'summary' as ActionType, label: 'Сводка', icon: CheckCheck, color: 'blue' },
        { action: 'suggest_reply' as ActionType, label: 'Варианты ответа', icon: MessageSquarePlus, color: 'green' },
      ],
    };

    return baseActions[dealStage] || baseActions.unknown;
  };

  const stageInfo = stageInfoMap[dealStage];
  const actions = getActionsForStage();

  const colorClasses: Record<string, { bg: string; hover: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', text: 'text-green-700', border: 'border-green-200' },
    orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    gray: { bg: 'bg-gray-50', hover: 'hover:bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full mb-2 left-0 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50"
      style={{ maxHeight: '40vh', minHeight: '220px' }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-1">
          <Bot className="w-4 h-4 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">AI-Помощник сделки</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-blue-100">{messages.length} сообщений</span>
              <span className="text-blue-200">•</span>
              <span className={`px-2 py-0.5 rounded ${stageInfo.bgColor} ${stageInfo.color} font-medium`}>
                {stageInfo.name}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-blue-200 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Actions */}
      {!currentAction && !showTextInput && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-gray-600 mb-2">Выберите действие:</p>

          <div className="grid grid-cols-2 gap-2">
            {actions.map((item, idx) => {
              const colors = colorClasses[item.color] || colorClasses.gray;
              const Icon = item.icon;

              return (
                <button
                  key={idx}
                  onClick={() => item.onClick ? item.onClick() : handleAction(item.action)}
                  disabled={loading}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 ${colors.bg} ${colors.hover} ${colors.text} rounded-lg text-xs font-medium transition-colors border ${colors.border}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Text Input */}
      {showTextInput && !currentAction && (
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-600">
              {textInputType === 'improve' && 'Введите текст для улучшения:'}
              {textInputType === 'check' && 'Введите текст для проверки:'}
              {textInputType === 'neutral' && 'Перефразировать нейтрально:'}
            </p>
            <button
              onClick={() => {
                setShowTextInput(false);
                setMessageToProcess('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            value={messageToProcess}
            onChange={(e) => setMessageToProcess(e.target.value)}
            placeholder="Например: Привет, давайте обсудим условия..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            autoFocus
          />

          <button
            onClick={handleTextProcessing}
            disabled={loading || !messageToProcess.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Обрабатываю...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {textInputType === 'improve' && 'Улучшить'}
                {textInputType === 'check' && 'Проверить'}
                {textInputType === 'neutral' && 'Перефразировать'}
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
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(40vh - 140px)' }}>
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-700">
                {currentAction === 'summary' && 'Сводка договоренностей'}
                {currentAction === 'risks' && 'Возможные риски'}
                {currentAction === 'suggest_reply' && 'Варианты ответов'}
                {currentAction === 'next_steps' && 'Рекомендуемые шаги'}
                {currentAction === 'suggest_first_message' && 'Варианты первого сообщения'}
                {currentAction === 'checklist' && 'Чеклист'}
                {currentAction === 'review_help' && 'Помощь с отзывом'}
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
            {(currentAction === 'suggest_reply' || currentAction === 'next_steps' || currentAction === 'suggest_first_message') ? (
              <div className="space-y-2">
                {parseListResponse(aiResponse).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                  >
                    <span className="text-sm text-gray-900 flex-1">{item}</span>
                    {(currentAction === 'suggest_reply' || currentAction === 'suggest_first_message') && (
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
                {(textInputType === 'improve' || textInputType === 'neutral') && (
                  <button
                    onClick={() => handleCopyToInput(aiResponse)}
                    className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    <Copy className="w-3 h-3" />
                    Вставить в поле ввода
                  </button>
                )}
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
