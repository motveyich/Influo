import React from 'react';
import { Plus, Users, TrendingUp, Eye } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { mockInfluencers, demoToastMessages } from '../mockData';

export function DemoInfluencerCardsPage() {
  const { showToast, ToastContainer } = useDemoToast();

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Карточки инфлюенсеров
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Создавайте и делитесь своими карточками
          </p>
        </div>
        <button
          onClick={() => showToast('Создание карточки доступно после регистрации. Карточка — это визитка инфлюенсера с основной информацией.')}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Создать карточку</span>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>Что такое карточки?</strong> Карточки — это визитки инфлюенсеров с ключевой информацией:
          статистика, ниша, примеры работ. Они используются для быстрого знакомства с блогером.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockInfluencers.map((influencer) => (
          <div
            key={influencer.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden cursor-pointer"
            onClick={() => showToast('В реальной версии открывается полная карточка с детальной статистикой, портфолио и контактами.')}
          >
            {/* Header with blurred background */}
            <div className="relative h-32 bg-gradient-to-br from-blue-500 to-cyan-500">
              <div className="absolute inset-0 backdrop-blur-sm"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-lg font-bold text-white drop-shadow-lg">
                  {influencer.name}
                </h3>
                <p className="text-sm text-white/90 drop-shadow">
                  {influencer.niche}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {influencer.description}
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Подписчики</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(influencer.followers / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Engagement</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {influencer.engagement}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {influencer.tags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {influencer.tags.length > 2 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                    +{influencer.tags.length - 2}
                  </span>
                )}
              </div>

              {/* View Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showToast(demoToastMessages.viewDetails);
                }}
                className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Посмотреть карточку</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State for Personal Cards */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center mt-8">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Создайте свою карточку
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
          После регистрации вы сможете создать собственную карточку инфлюенсера с вашей статистикой и портфолио
        </p>
        <button
          onClick={() => showToast('Создание карточки станет доступно после регистрации и заполнения профиля.')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Создать сейчас
        </button>
      </div>
    </div>
  );
}
