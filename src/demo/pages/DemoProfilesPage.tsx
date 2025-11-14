import React from 'react';
import { Heart, Send, Eye, Users, TrendingUp } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { mockInfluencers, demoToastMessages } from '../mockData';

export function DemoProfilesPage() {
  const { showToast, ToastContainer } = useDemoToast();

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Инфлюенсеры
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Найдите идеальных партнёров для вашего бренда
          </p>
        </div>
        <button
          onClick={() => showToast('Фильтры и поиск доступны после регистрации. В полной версии вы сможете искать по нише, подписчикам, ER и другим параметрам.')}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Фильтры
        </button>
      </div>

      {/* Influencers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockInfluencers.map((influencer) => (
          <div
            key={influencer.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden"
          >
            {/* Blurred Photo */}
            <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700">
              <div className="absolute inset-0 backdrop-blur-2xl flex items-center justify-center">
                <Users className="w-16 h-16 text-white opacity-50" />
              </div>
              <div className="absolute top-3 right-3 bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                {influencer.niche}
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {influencer.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {influencer.description}
              </p>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 text-sm">
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{(influencer.followers / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>ER {influencer.engagement}%</span>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {influencer.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => showToast(demoToastMessages.viewDetails)}
                  className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Подробнее</span>
                </button>
                <button
                  onClick={() => showToast(demoToastMessages.addToFavorites)}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-2 rounded-lg transition-colors"
                >
                  <Heart className="w-5 h-5" />
                </button>
                <button
                  onClick={() => showToast(demoToastMessages.sendOffer)}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 p-2 rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      <div className="flex justify-center">
        <button
          onClick={() => showToast('В полной версии здесь загружаются дополнительные инфлюенсеры из базы данных.')}
          className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-2 rounded-lg transition-colors"
        >
          Загрузить ещё
        </button>
      </div>
    </div>
  );
}
