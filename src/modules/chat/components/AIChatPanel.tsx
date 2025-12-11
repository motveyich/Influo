import React, { useState, useEffect, useRef } from 'react';
import { AIChatMessage, AIChatThread, ChatMessage } from '../../../core/types';
import { aiChatService } from '../../../services/aiChatService';
import { useTranslation } from '../../../hooks/useTranslation';
import { Bot, Send, Brain, Minimize2, Maximize2, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface AIChatPanelProps {
  currentUserId: string;
  partnerId: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  conversationMessages: ChatMessage[];
}

export function AIChatPanel({ 
  currentUserId, 
  partnerId, 
  isVisible, 
  onToggleVisibility, 
  conversationMessages 
}: AIChatPanelProps) {
  const { t } = useTranslation();
  const [thread, setThread] = useState<AIChatThread | null>(null);
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI thread when panel opens
  useEffect(() => {
    if (currentUserId && partnerId && isVisible) {
      initializeAIThread();
    }
  }, [currentUserId, partnerId, isVisible]);

  // Scroll to bottom when new AI messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [aiMessages]);

  const initializeAIThread = async () => {
    try {
      setIsLoading(true);
      // Create personal thread for current user only
      const aiThread = await aiChatService.getOrCreatePersonalThread(currentUserId);
      setThread(aiThread);
      
      // Load existing AI messages for this thread
      const existingMessages = await aiChatService.getThreadMessages(aiThread.id);
      setAiMessages(existingMessages);
    } catch (error) {
      console.error('Failed to initialize AI thread:', error);
      toast.error('Не удалось инициализировать AI-помощника');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerConversationAnalysis = async () => {
    if (!thread || isAnalyzing || conversationMessages.length < 2) return;

    if (conversationMessages.length < 2) {
      toast.error('Недостаточно сообщений для анализа (минимум 2)');
      return;
    }

    try {
      setIsAnalyzing(true);
      
      // Analyze conversation using real messages
      const analysisMessage = await aiChatService.analyzeConversationWithAI(
        thread.id, 
        conversationMessages,
        currentUserId,
        partnerId
      );
      
      // Add analysis message to UI
      setAiMessages(prev => [...prev, analysisMessage]);
      
    } catch (error) {
      console.error('Failed to analyze conversation:', error);
      
      // Show user-friendly error messages
      if (error.message.includes('Supabase не настроен')) {
        toast.error('AI-анализ недоступен: требуется настройка Supabase');
      } else if (error.message.includes('Не удалось подключиться к AI-сервису')) {
        toast.error('AI-сервис временно недоступен');
      } else {
        toast.error('Не удалось проанализировать диалог');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendUserQuestion = async () => {
    if (!userQuestion.trim() || !thread) return;

    try {
      setIsLoading(true);
      
      // Save user question and get AI response
      const aiResponse = await aiChatService.askAIQuestion(
        thread.id,
        userQuestion,
        currentUserId,
        conversationMessages,
        partnerId
      );
      
      // Add both user question and AI response to UI
      const userQuestionMessage: AIChatMessage = {
        id: `user_${Date.now()}`,
        threadId: thread.id,
        messageType: 'user_question',
        content: userQuestion,
        metadata: { user_id: currentUserId },
        createdAt: new Date().toISOString()
      };
      
      setAiMessages(prev => [...prev, userQuestionMessage, aiResponse]);
      setUserQuestion('');
      
    } catch (error: any) {
      console.error('Failed to send user question:', error);
      toast.error(error.message || 'Не удалось отправить вопрос AI');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageTypeIcon = (messageType: AIChatMessage['messageType']) => {
    switch (messageType) {
      case 'user_question':
        return '🙋‍♂️';
      case 'ai_response':
        return '🤖';
      case 'ai_analysis':
        return '📊';
      case 'ai_suggestion':
        return '💡';
      default:
        return '💬';
    }
  };

  const getMessageTypeLabel = (messageType: AIChatMessage['messageType']) => {
    switch (messageType) {
      case 'user_question':
        return 'Ваш вопрос';
      case 'ai_response':
        return 'AI Ответ';
      case 'ai_analysis':
        return 'Анализ диалога';
      case 'ai_suggestion':
        return 'Рекомендация';
      default:
        return 'Сообщение';
    }
  };

  // Collapsed view when panel is hidden
  if (!isVisible) {
    return (
      <div className="w-12 bg-white border-l border-gray-300 flex flex-col items-center py-4">
        <button
          onClick={onToggleVisibility}
          className="p-2 text-gray-400 hover:text-blue-600 transition-colors relative"
          title="Открыть AI-ассистента"
        >
          <Bot className="w-6 h-6" />
          {aiMessages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-600 rounded-full"></div>
          )}
        </button>
        {conversationMessages.length >= 2 && (
          <div className="mt-2 text-xs text-gray-500 text-center px-1">
            AI готов к анализу
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-300 flex flex-col">
      {/* AI Panel Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-600 rounded-full flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">DeepSeek AI Ассистент</h3>
              <p className="text-xs text-gray-600">
                Персональный помощник • {conversationMessages.length} сообщений для анализа
              </p>
            </div>
          </div>
          <button
            onClick={onToggleVisibility}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Свернуть панель"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Status indicators */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isAnalyzing && (
              <div className="flex items-center space-x-2 text-xs text-blue-600">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                <span>Анализирую диалог...</span>
              </div>
            )}
            {!isAnalyzing && conversationMessages.length >= 2 && (
              <div className="flex items-center space-x-2 text-xs text-green-600">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Готов к анализу</span>
              </div>
            )}
          </div>
          
          <button
            onClick={triggerConversationAnalysis}
            disabled={isAnalyzing || conversationMessages.length < 2}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 flex items-center space-x-1"
          >
            <BarChart3 className="w-3 h-3" />
            <span>{isAnalyzing ? 'Анализ...' : 'Анализ'}</span>
          </button>
        </div>
      </div>

      {/* AI Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading && aiMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Инициализация AI...</p>
          </div>
        ) : aiMessages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 mb-4">AI-ассистент готов к работе</p>
            {conversationMessages.length >= 2 && (
              <button
                onClick={triggerConversationAnalysis}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? 'Анализирую...' : 'Анализировать диалог'}
              </button>
            )}
          </div>
        ) : (
          aiMessages.map((message) => (
            <div key={message.id} className="space-y-2">
              {/* Message header */}
              <div className="flex items-center space-x-2">
                <span className="text-lg">
                  {getMessageTypeIcon(message.messageType)}
                </span>
                <span className="text-xs font-medium text-gray-600">
                  {getMessageTypeLabel(message.messageType)}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(parseISO(message.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Message content */}
              <div className={`p-3 rounded-lg ${
                message.messageType === 'user_question'
                  ? 'bg-blue-600 text-white ml-8'
                  : message.messageType === 'ai_analysis'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : message.messageType === 'ai_suggestion'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                <div className="text-sm whitespace-pre-line leading-relaxed">
                  {message.content}
                </div>
                
                {/* Metadata */}
                {message.metadata.confidence && (
                  <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                    Уверенность: {(message.metadata.confidence * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Input & Controls */}
      <div className="p-4 border-t border-gray-200 bg-white space-y-3">
        {/* Main input */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder={t('chat.aiAssistant.askQuestion')}
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendUserQuestion()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendUserQuestion}
            disabled={!userQuestion.trim() || isLoading}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Отправить вопрос"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={triggerConversationAnalysis}
            disabled={isAnalyzing || conversationMessages.length < 2}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
          >
            <BarChart3 className="w-3 h-3" />
            <span>{isAnalyzing ? 'Анализирую...' : t('chat.aiAssistant.analyzeDialog')}</span>
          </button>
          
          <button
            onClick={() => setUserQuestion(t('chat.aiAssistant.riskAssessment'))}
            disabled={conversationMessages.length < 2}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-medium transition-colors flex items-center justify-center space-x-1"
          >
            <Zap className="w-3 h-3" />
            <span>{t('chat.aiAssistant.riskAssessment')}</span>
          </button>
        </div>

        {/* Quick questions */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setUserQuestion(t('chat.aiAssistant.nextSteps'))}
            disabled={conversationMessages.length < 2}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
          >
            {t('chat.aiAssistant.nextSteps')}
          </button>
          <button
            onClick={() => setUserQuestion(t('chat.aiAssistant.sentiment'))}
            disabled={conversationMessages.length < 2}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
          >
            {t('chat.aiAssistant.sentiment')}
          </button>
          <button
            onClick={() => setUserQuestion(t('chat.aiAssistant.conditions'))}
            disabled={conversationMessages.length < 2}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
          >
            {t('chat.aiAssistant.conditions')}
          </button>
        </div>

        {/* Status */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            🧠 DeepSeek V3 • {t('chat.aiAssistant.personalAssistant')} • {conversationMessages.length < 2 ? 'Ожидание диалога (мин. 2 сообщения)' : `${conversationMessages.length} сообщений для анализа`}
          </p>
        </div>
      </div>
    </div>
  );
}