import React, { useState, useEffect, useRef } from 'react';
import { AIChatMessage, AIChatThread } from '../../../core/types';
import { aiChatService } from '../../../services/aiChatService';
import { Bot, Send, Lightbulb, TrendingUp, AlertTriangle, MessageCircle, Minimize2, Maximize2, HelpCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

interface AIChatPanelProps {
  user1Id: string;
  user2Id: string;
  isVisible: boolean;
  onToggleVisibility: () => void;
  conversationMessages: any[];
}

export function AIChatPanel({ user1Id, user2Id, isVisible, onToggleVisibility, conversationMessages }: AIChatPanelProps) {
  const [thread, setThread] = useState<AIChatThread | null>(null);
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user1Id && user2Id && isVisible) {
      initializeThread();
    }
  }, [user1Id, user2Id, isVisible]);

  useEffect(() => {
    // Listen for manual analysis triggers
    const handleAnalysisTrigger = (event: any) => {
      if (event.detail?.messages && thread) {
        triggerAnalysis(event.detail.messages);
      }
    };

    window.addEventListener('triggerAIAnalysis', handleAnalysisTrigger);
    
    // Auto-trigger analysis when conversation messages change
    if (thread && conversationMessages.length >= 2) {
      const shouldAnalyze = conversationMessages.length % 3 === 0 || 
                           (conversationMessages.length >= 2 && messages.length === 1); // First analysis
      if (shouldAnalyze) {
        triggerAnalysis(conversationMessages);
      }
    }

    return () => {
      window.removeEventListener('triggerAIAnalysis', handleAnalysisTrigger);
    };
  }, [thread, conversationMessages, messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeThread = async () => {
    try {
      setIsLoading(true);
      const aiThread = await aiChatService.getOrCreateThread(user1Id, user2Id);
      setThread(aiThread);
      
      const threadMessages = await aiChatService.getThreadMessages(aiThread.id);
      setMessages(threadMessages);
    } catch (error) {
      console.error('Failed to initialize AI thread:', error);
      toast.error('Не удалось инициализировать AI-помощника');
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAnalysis = async (messages: any[]) => {
    if (!thread || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      const analysisMessage = await aiChatService.analyzeConversation(thread.id, messages);
      
      if (analysisMessage) {
        setMessages(prev => [...prev, analysisMessage]);
      }
    } catch (error) {
      console.error('Failed to trigger analysis:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendQuestion = async () => {
    if (!newMessage.trim() || !thread) return;

    try {
      setIsLoading(true);
      const userMessage = {
        id: `temp_${Date.now()}`,
        threadId: thread.id,
        messageType: 'user_question' as const,
        content: newMessage,
        metadata: {},
        createdAt: new Date().toISOString()
      };

      // Optimistically add user message
      setMessages(prev => [...prev, userMessage]);
      setNewMessage('');

      // Send to AI service
      const aiResponse = await aiChatService.sendUserQuestion(thread.id, newMessage, user1Id);
      
      // Replace temp message and add AI response
      setMessages(prev => [
        ...prev.filter(m => m.id !== userMessage.id),
        userMessage,
        aiResponse
      ]);
    } catch (error: any) {
      console.error('Failed to send question:', error);
      toast.error(error.message || 'Не удалось отправить вопрос AI');
      
      // Remove temp message on error
      setMessages(prev => prev.filter(m => m.id !== `temp_${Date.now()}`));
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getMessageIcon = (messageType: AIChatMessage['messageType']) => {
    switch (messageType) {
      case 'user_question':
        return <HelpCircle className="w-4 h-4 text-blue-600" />;
      case 'ai_response':
        return <Bot className="w-4 h-4 text-purple-600" />;
      case 'ai_analysis':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'ai_suggestion':
        return <Lightbulb className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMessageTypeLabel = (messageType: AIChatMessage['messageType']) => {
    switch (messageType) {
      case 'user_question':
        return 'Вопрос';
      case 'ai_response':
        return 'AI Ответ';
      case 'ai_analysis':
        return 'Анализ';
      case 'ai_suggestion':
        return 'Рекомендация';
      default:
        return 'Сообщение';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'constructive':
        return 'text-green-600 bg-green-50';
      case 'concerning':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  if (!isVisible) {
    return (
      <div className="w-12 bg-white border-l border-gray-300 flex flex-col items-center py-4">
        <button
          onClick={onToggleVisibility}
          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
          title="Открыть AI-помощника"
        >
          <Bot className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-300 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI-Помощник</h3>
              <p className="text-xs text-gray-600">Анализ диалога и рекомендации</p>
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
        
        {isAnalyzing && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-purple-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-purple-600"></div>
            <span>Анализирую диалог...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading && messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Инициализация AI-помощника...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${
                message.messageType === 'user_question' ? 'ml-4' : 'mr-4'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.messageType === 'user_question'
                    ? 'bg-blue-600 text-white'
                    : message.messageType === 'ai_analysis'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : message.messageType === 'ai_suggestion'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                {/* Message Header */}
                {message.messageType !== 'user_question' && (
                  <div className="flex items-center space-x-2 mb-2">
                    {getMessageIcon(message.messageType)}
                    <span className="text-xs font-medium">
                      {getMessageTypeLabel(message.messageType)}
                    </span>
                    {message.metadata.conversationStatus && (
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(message.metadata.conversationStatus)}`}>
                        {message.metadata.conversationStatus === 'constructive' ? 'Конструктивно' :
                         message.metadata.conversationStatus === 'concerning' ? 'Требует внимания' : 'Нейтрально'}
                      </span>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm whitespace-pre-line">
                  {message.content}
                </div>

                {/* Suggested Actions */}
                {message.metadata.suggestedActions && message.metadata.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Предлагаемые действия:</p>
                    <div className="space-y-1">
                      {message.metadata.suggestedActions.map((action: string, index: number) => (
                        <button
                          key={index}
                          className="block w-full text-left px-2 py-1 text-xs bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                          onClick={() => setNewMessage(action)}
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-xs mt-2 ${
                  message.messageType === 'user_question' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatDistanceToNow(parseISO(message.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Задайте вопрос AI-помощнику..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendQuestion()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={sendQuestion}
            disabled={!newMessage.trim() || isLoading}
            className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setNewMessage('Как лучше развить этот диалог?')}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
          >
            Как развить диалог?
          </button>
          <button
            onClick={() => setNewMessage('Оцени ситуацию в переговорах')}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
          >
            Оценка ситуации
          </button>
          <button
            onClick={() => setNewMessage('Какие следующие шаги посоветуешь?')}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition-colors"
          >
            Следующие шаги
          </button>
        </div>

        {/* Status indicator */}
        <div className="mt-2 text-xs text-gray-500 text-center">
          AI анализирует диалог в реальном времени
        </div>
      </div>
    </div>
  );
}