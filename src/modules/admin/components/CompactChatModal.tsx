import React from 'react';
import { X, Send } from 'lucide-react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Message {
  id: string;
  senderId: string;
  messageContent: string;
  timestamp: string;
}

interface Participant {
  id: string;
  profile: {
    full_name: string;
    avatar?: string;
  };
}

interface CompactChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  influencer: Participant;
  advertiser: Participant;
}

export function CompactChatModal({
  isOpen,
  onClose,
  messages,
  influencer,
  advertiser
}: CompactChatModalProps) {
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const getParticipantName = (senderId: string) => {
    if (senderId === influencer.id) return influencer.profile.full_name || 'Инфлюенсер';
    if (senderId === advertiser.id) return advertiser.profile.full_name || 'Рекламодатель';
    return 'Неизвестно';
  };

  const getParticipantAvatar = (senderId: string) => {
    if (senderId === influencer.id) return influencer.profile.avatar;
    if (senderId === advertiser.id) return advertiser.profile.avatar;
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">История чата</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {influencer.profile.full_name} и {advertiser.profile.full_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Сообщений нет</p>
            </div>
          ) : (
            messages.map((message) => {
              const avatar = getParticipantAvatar(message.senderId);
              const name = getParticipantName(message.senderId);
              const isInfluencer = message.senderId === influencer.id;

              return (
                <div key={message.id} className={`flex ${isInfluencer ? 'flex-row' : 'flex-row-reverse'} items-start space-x-3`}>
                  <div className="flex-shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`flex-1 ${isInfluencer ? 'ml-3' : 'mr-3'}`}>
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(parseISO(message.timestamp), 'dd.MM.yyyy HH:mm', { locale: ru })}
                      </span>
                    </div>
                    <div className={`inline-block px-4 py-2 rounded-lg ${
                      isInfluencer
                        ? 'bg-blue-100 dark:bg-blue-900 text-gray-900 dark:text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.messageContent}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Всего сообщений: {messages.length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              Режим только для чтения
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
