import React from 'react';
import { Shield, Mail, AlertTriangle } from 'lucide-react';

export function BlockedUserNotice() {
  const handleContactSupport = () => {
    // В реальном приложении здесь был бы переход к форме поддержки
    window.open('mailto:support@influo.com?subject=Обращение по заблокированному аккаунту', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl border border-red-200">
        {/* Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">Аккаунт заблокирован</h2>
              <p className="text-sm text-red-700">Доступ к платформе ограничен</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-start space-x-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  Ваш аккаунт был заблокирован администратором
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Это могло произойти из-за нарушения правил платформы или по результатам 
                  рассмотрения жалоб. Для получения дополнительной информации и возможного 
                  восстановления доступа обратитесь в службу поддержки.
                </p>
              </div>
            </div>
          </div>

          {/* Support Contact */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Что делать дальше?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Обратитесь в службу поддержки для выяснения причин блокировки</li>
              <li>• Предоставьте дополнительную информацию, если это необходимо</li>
              <li>• Дождитесь рассмотрения вашего обращения</li>
            </ul>
          </div>

          {/* Contact Button */}
          <button
            onClick={handleContactSupport}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <Mail className="w-5 h-5" />
            <span>Обратиться в поддержку</span>
          </button>

          {/* Additional Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Время блокировки: {new Date().toLocaleString('ru-RU')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}