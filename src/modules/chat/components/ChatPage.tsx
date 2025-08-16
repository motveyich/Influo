import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../../core/types';
import { Send, Search, MoreVertical, Paperclip, Phone, Video, MessageCircle, Handshake, AlertTriangle } from 'lucide-react';
import { realtimeService } from '../../../core/realtime';
import { chatService } from '../services/chatService';
import { CollaborationRequestModal } from './CollaborationRequestModal';
import { useAuth } from '../../../hooks/useAuth';
import { useTranslation } from '../../../hooks/useTranslation';
import { useProfileCompletion } from '../../profiles/hooks/useProfileCompletion';
import { analytics } from '../../../core/analytics';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { supabase } from '../../../core/supabase';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  isOnline: boolean;
}
export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [rateLimitWarning, setRateLimitWarning] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const currentUserId = user?.id || '';
  const { profile: currentUserProfile } = useProfileCompletion(currentUserId);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  useEffect(() => {
    // Check for userId parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('userId');
    if (userIdParam) {
      setTargetUserId(userIdParam);
      // Clear the URL parameter
      window.history.replaceState({}, '', '/chat');
    }
    
    if (currentUserId && !loading) {
      loadConversations();
    }
    
    // Subscribe to real-time chat messages
    if (currentUserId) {
      const subscription = realtimeService.subscribeToChatMessages(
        currentUserId,
        handleNewMessage
      );

      return () => {
        realtimeService.unsubscribe(`chat_${currentUserId}`);
      };
    }
  }, [currentUserId, loading]);

  useEffect(() => {
    if (selectedConversation && currentUserId) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      const loadedConversations = await chatService.getUserConversations(currentUserId);
      setConversations(loadedConversations);
      
      // If we have a target user ID, try to find or create that conversation
      if (targetUserId) {
        const existingConversation = loadedConversations.find(conv => conv.participantId === targetUserId);
        if (existingConversation) {
          setSelectedConversation(existingConversation);
        } else {
          // Create a new conversation entry for the target user
          await createNewConversation(targetUserId);
        }
        setTargetUserId(null); // Clear after processing
      } else if (!selectedConversation && loadedConversations.length > 0) {
        setSelectedConversation(loadedConversations[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (userId: string) => {
    try {
      // Get user profile to create conversation entry
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, avatar')
        .eq('user_id', userId)
        .single();
      
      if (userProfile) {
        const newConversation: Conversation = {
          id: userId,
          participantId: userId,
          participantName: userProfile.full_name || 'Пользователь',
          participantAvatar: userProfile.avatar,
          unreadCount: 0,
          isOnline: false
        };
        
        setConversations(prev => [newConversation, ...prev]);
        setSelectedConversation(newConversation);
      }
    } catch (error) {
      console.error('Failed to create new conversation:', error);
      toast.error('Не удалось создать диалог');
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const partnerId = selectedConversation?.participantId;
      if (partnerId) {
        const loadedMessages = await chatService.getConversation(currentUserId, partnerId);
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewMessage = (message: any) => {
    console.log('New message received:', message);
    // Update messages list and conversations
    if (message.new) {
      setMessages(prev => [...prev, message.new]);
      updateConversationLastMessage(message.new);
    }
  };

  const updateConversationLastMessage = (message: ChatMessage) => {
    setConversations(prev => prev.map(conv => {
      if (conv.participantId === message.senderId || conv.participantId === message.receiverId) {
        return {
          ...conv,
          lastMessage: message,
          unreadCount: message.senderId !== currentUserId ? conv.unreadCount + 1 : conv.unreadCount
        };
      }
      return conv;
    }));
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    // Check basic profile completion
    if (!currentUserProfile?.profileCompletion.basicInfo) {
      toast.error('Заполните основную информацию профиля для отправки сообщений');
      return;
    }

    const messageData: Partial<ChatMessage> = {
      senderId: currentUserId,
      receiverId: selectedConversation.participantId,
      messageContent: newMessage,
      messageType: 'text',
    };

    setNewMessage('');
    setRateLimitWarning(false);

    try {
      const sentMessage = await chatService.sendMessage(messageData);
      
      // Optimistically add message
      setMessages(prev => [...prev, sentMessage]);

      // Update conversation
      updateConversationLastMessage(sentMessage);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      
      if (error.message.includes('Rate limit exceeded')) {
        setRateLimitWarning(true);
        setTimeout(() => setRateLimitWarning(false), 5000);
      } else if (error.message.includes('queued due to delivery delay')) {
        setConnectionStatus('connecting');
        setTimeout(() => setConnectionStatus('connected'), 3000);
      }
      
      // Show user-friendly error message
      console.warn('Message delivery issue:', error.message);
    }
  };

  const handleSendCollaborationRequest = () => {
    if (!selectedConversation) return;
    
    // Check if user has influencer profile setup
    if (!currentUserProfile?.profileCompletion.influencerSetup) {
      toast.error('Заполните раздел "Инфлюенсер" для отправки запросов на сотрудничество');
      return;
    }
    
    setShowCollaborationModal(true);
  };

  const handleCollaborationRequestSent = () => {
    // Refresh messages to show the collaboration request
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatMessageTime = (timestamp: string) => {
    const date = parseISO(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 24 * 7) {
      return format(date, 'EEE HH:mm');
    } else {
      return format(date, 'MMM dd');
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Conversations Sidebar */}
      <div className="w-1/3 border-r border-gray-300 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder={t('chat.searchConversations')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Нет активных чатов</h3>
              <p className="text-sm text-gray-600 mb-4">
                У вас пока нет активных диалогов. Начните общение, отправив заявку на карточку или кампанию.
              </p>
              <div className="space-y-2 text-sm text-gray-500">
                <p>💡 Совет: Перейдите в раздел "Карточки" чтобы:</p>
                <ul className="text-left space-y-1 ml-4">
                  <li>• Найти подходящих партнеров</li>
                  <li>• Отправить заявку на сотрудничество</li>
                  <li>• Начать диалог</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`flex items-center space-x-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                      {conversation.participantAvatar ? (
                        <img 
                          src={conversation.participantAvatar} 
                          alt={conversation.participantName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-semibold">
                          {conversation.participantName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {conversation.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.participantName}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conversation.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {conversation.lastMessage.messageContent}
                      </p>
                    )}
                  </div>
                  
                  {conversation.unreadCount > 0 && (
                    <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-medium">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {selectedConversation.participantName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {selectedConversation.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {selectedConversation.participantName}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {selectedConversation.isOnline ? t('common.online') : `${t('chat.lastSeen')} ${formatDistanceToNow(parseISO(selectedConversation.lastMessage?.timestamp || ''), { addSuffix: true })}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <Video className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <MoreVertical className="w-5 h-5" />
                </button>
                <button
                  onClick={handleSendCollaborationRequest}
                  className="p-2 text-gray-400 hover:text-purple-600 rounded-md hover:bg-gray-100"
                  title="Send collaboration request"
                >
                  <Handshake className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== 'connected' && (
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                <div className="flex items-center space-x-2 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>
                    {connectionStatus === 'connecting' ? t('chat.reconnecting') : t('chat.connectionLost')}
                  </span>
                </div>
              </div>
            )}

            {/* Rate Limit Warning */}
            {rateLimitWarning && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <div className="flex items-center space-x-2 text-sm text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t('chat.rateLimitWarning')}</span>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === currentUserId
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.messageContent}</p>
                    <p className={`text-xs mt-1 ${
                      message.senderId === currentUserId ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  placeholder={t('chat.typeMessage')}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Разговор не выбран</h3>
              <p className="text-gray-600">Выберите разговор из боковой панели, чтобы начать общение</p>
            </div>
          </div>
        )}
      </div>

      {/* Collaboration Request Modal */}
      <CollaborationRequestModal
        isOpen={showCollaborationModal}
        onClose={() => setShowCollaborationModal(false)}
        receiverId={selectedConversation?.participantId || ''}
        senderId={currentUserId}
        onRequestSent={handleCollaborationRequestSent}
      />
    </div>
  );
}