import React, { useState } from 'react';
import { Send, Bot } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { mockMessages, demoToastMessages } from '../mockData';

export function DemoChatPage() {
  const { showToast, ToastContainer } = useDemoToast();
  const [messageInput, setMessageInput] = useState('');

  const conversations = [
    {
      id: '1',
      name: 'Beauty Pro',
      lastMessage: 'Отлично! Мы запускаем новую...',
      time: '11:15',
      unread: 1,
    },
    {
      id: '2',
      name: 'Tech Solutions',
      lastMessage: 'Спасибо за интерес к нашей...',
      time: 'Вчера',
      unread: 0,
    },
    {
      id: '3',
      name: 'Fashion House',
      lastMessage: 'Когда сможете начать?',
      time: '2 дня',
      unread: 0,
    },
  ];

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      showToast(demoToastMessages.sendMessage);
      setMessageInput('');
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)]">
      <ToastContainer />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col lg:flex-row overflow-hidden">
        {/* Conversations List */}
        <div className="lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Сообщения
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => showToast('В реальной версии здесь открывается выбранный диалог.')}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {conv.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {conv.time}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {conv.lastMessage}
                  </p>
                  {conv.unread > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Beauty Pro
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Онлайн
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {mockMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {!message.isOwn && (
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {message.sender}
                    </p>
                  )}
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Введите сообщение..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                onClick={handleSendMessage}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Отправить</span>
              </button>
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="hidden xl:block w-80 border-l border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-2 mb-4">
            <Bot className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Анализ диалога
            </h3>
          </div>

          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => showToast('Анализ сообщений с помощью AI доступен только зарегистрированным пользователям. Система анализирует тон, ключевые моменты и предлагает ответы.')}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
              Анализ диалога доступен только зарегистрированным пользователям
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                Что это?
              </p>
              <p className="text-xs text-blue-800 dark:text-purple-400">
                AI анализирует ваши переписки и помогает:
              </p>
              <ul className="text-xs text-blue-800 dark:text-purple-400 mt-2 space-y-1 ml-3">
                <li>• Определять тон разговора</li>
                <li>• Выделять ключевые моменты</li>
                <li>• Предлагать ответы</li>
                <li>• Отслеживать договорённости</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
