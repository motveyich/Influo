import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Target, Users, MessageCircle, TrendingUp, Shield, Globe, Rocket } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';

export function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const handleAuthClick = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const features = [
    {
      icon: Target,
      title: 'Умный поиск',
      description: 'Находите идеальных инфлюенсеров для вашего бренда с помощью AI'
    },
    {
      icon: Users,
      title: 'Прямые контакты',
      description: 'Общайтесь напрямую без посредников'
    },
    {
      icon: MessageCircle,
      title: 'Безопасные сделки',
      description: 'Встроенная система платежей и контроль качества'
    },
    {
      icon: TrendingUp,
      title: 'Аналитика',
      description: 'Отслеживайте результаты в реальном времени'
    },
    {
      icon: Shield,
      title: 'Защита данных',
      description: 'Ваши данные под надежной защитой'
    },
    {
      icon: Globe,
      title: 'Глобальный охват',
      description: 'Работайте с инфлюенсерами по всему миру'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Influo</span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleAuthClick('signin')}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Войти
              </button>
              <button
                onClick={() => handleAuthClick('signup')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                Регистрация
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Просто найди.
            <br />
            <span className="text-blue-600">Легко договорись.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Платформа для эффективного взаимодействия брендов и инфлюенсеров.
            Находите партнёров, договаривайтесь о сотрудничестве, растите вместе.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/profiles"
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Попробовать демо
            </Link>
            <button
              onClick={() => handleAuthClick('signup')}
              className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold hover:bg-gray-50 transition-colors border-2 border-gray-200"
            >
              Создать аккаунт
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Всё необходимое в одном месте
          </h2>
          <p className="text-xl text-gray-600">
            Полный набор инструментов для успешного сотрудничества
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-r from-blue-600 to-cyan-600 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">1,234</div>
              <div className="text-xl text-blue-100">Инфлюенсеров</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-xl text-blue-100">Брендов</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">2,500+</div>
              <div className="text-xl text-blue-100">Успешных сделок</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-12 text-center text-white">
          <Rocket className="w-16 h-16 mx-auto mb-6 text-blue-400" />
          <h2 className="text-4xl font-bold mb-4">
            Готовы начать?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Присоединяйтесь к тысячам брендов и инфлюенсеров, которые уже растут вместе с Influo
          </p>
          <button
            onClick={() => handleAuthClick('signup')}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Начать бесплатно
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Influo</span>
            </div>
            <div className="text-center md:text-right">
              <p>&copy; 2025 Influo. Платформа для инфлюенсер-маркетинга.</p>
            </div>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
