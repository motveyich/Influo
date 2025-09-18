import React, { useState } from 'react';
import { 
  HelpCircle, 
  Mail, 
  MessageCircle, 
  FileText, 
  ExternalLink,
  Send,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export function SupportSettings() {
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: '',
    category: 'general',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitSupport = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      toast.error('Заполните тему и сообщение');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate support ticket submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Обращение отправлено! Мы ответим в течение 24 часов.');
      setContactForm({
        subject: '',
        category: 'general',
        message: '',
        priority: 'normal'
      });
      setShowContactForm(false);
    } catch (error) {
      toast.error('Не удалось отправить обращение');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Поддержка</h2>
        <p className="text-sm text-gray-600">Получите помощь и обратитесь в службу поддержки</p>
      </div>

      {/* Contact Support */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-md font-medium text-gray-900">Обратиться в поддержку</h3>
              <p className="text-sm text-gray-600">
                Свяжитесь с нашей командой поддержки для решения вопросов
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowContactForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <Mail className="w-4 h-4" />
            <span>Написать в поддержку</span>
          </button>
        </div>
      </div>

      {/* Quick Help Links */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <HelpCircle className="w-5 h-5 text-green-600" />
          <div>
            <h3 className="text-md font-medium text-gray-900">Быстрая помощь</h3>
            <p className="text-sm text-gray-600">Часто задаваемые вопросы и руководства</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="#"
            className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Руководство пользователя</p>
              <p className="text-xs text-gray-600">Полное руководство по использованию платформы</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          <a
            href="#"
            className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">FAQ</p>
              <p className="text-xs text-gray-600">Ответы на часто задаваемые вопросы</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          <a
            href="#"
            className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Сообщество</p>
              <p className="text-xs text-gray-600">Форум пользователей и обсуждения</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>

          <a
            href="#"
            className="flex items-center space-x-3 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Политика конфиденциальности</p>
              <p className="text-xs text-gray-600">Как мы обрабатываем ваши данные</p>
            </div>
            <ExternalLink className="w-4 h-4 text-gray-400" />
          </a>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Обратиться в поддержку</h3>
              <button 
                onClick={() => setShowContactForm(false)} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория обращения
                  </label>
                  <select
                    value={contactForm.category}
                    onChange={(e) => setContactForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="general">Общие вопросы</option>
                    <option value="technical">Технические проблемы</option>
                    <option value="billing">Вопросы по оплате</option>
                    <option value="account">Проблемы с аккаунтом</option>
                    <option value="feature">Предложения по улучшению</option>
                    <option value="bug">Сообщить об ошибке</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Приоритет
                  </label>
                  <select
                    value={contactForm.priority}
                    onChange={(e) => setContactForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Низкий</option>
                    <option value="normal">Обычный</option>
                    <option value="high">Высокий</option>
                    <option value="urgent">Срочный</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тема обращения
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Кратко опишите проблему или вопрос"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подробное описание
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Опишите вашу проблему или вопрос подробно. Включите шаги для воспроизведения, если это техническая проблема."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {contactForm.message.length}/2000 символов
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800">Время ответа</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Мы отвечаем на обращения в течение 24 часов в рабочие дни. 
                      Срочные вопросы обрабатываются приоритетно.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={() => setShowContactForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmitSupport}
                disabled={isSubmitting || !contactForm.subject.trim() || !contactForm.message.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Отправка...' : 'Отправить обращение'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}