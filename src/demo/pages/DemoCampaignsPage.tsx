import React, { useState } from 'react';
import { Plus, Calendar, DollarSign, Target, Send } from 'lucide-react';
import { useDemoToast } from '../DemoToast';
import { mockCampaigns, mockMyCampaigns, demoToastMessages } from '../mockData';

export function DemoCampaignsPage() {
  const { showToast, ToastContainer } = useDemoToast();
  const [activeTab, setActiveTab] = useState<'browse' | 'my'>('browse');

  return (
    <div className="space-y-6">
      <ToastContainer />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Автоматические кампании
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Найдите кампании или создайте свою
          </p>
        </div>
        <button
          onClick={() => showToast(demoToastMessages.createCampaign)}
          className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Создать кампанию</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('browse')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'browse'
              ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Все кампании
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'my'
              ? 'border-b-2 border-purple-600 text-purple-600 dark:text-purple-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          Мои кампании
        </button>
      </div>

      {/* Browse Campaigns */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          {mockCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {campaign.brand}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-medium rounded-full">
                      Активна
                    </span>
                  </div>

                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {campaign.description}
                  </p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>{campaign.budget}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>До {new Date(campaign.deadline).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Требования:</strong> {campaign.requirements}
                    </p>
                  </div>
                </div>

                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => showToast(demoToastMessages.applyToCampaign)}
                    className="flex-1 lg:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Откликнуться</span>
                  </button>
                  <button
                    onClick={() => showToast('В реальной версии здесь открывается детальная информация о кампании, включая полное описание, требования и условия.')}
                    className="flex-1 lg:flex-none bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg transition-colors"
                  >
                    Подробнее
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Campaigns */}
      {activeTab === 'my' && (
        <div className="space-y-4">
          {mockMyCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex flex-col lg:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                        {campaign.title}
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs font-medium rounded-full">
                      Черновик
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4" />
                      <span>{campaign.budget}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span>{campaign.niche}</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Создана: {new Date(campaign.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>

                <div className="flex lg:flex-col gap-2">
                  <button
                    onClick={() => showToast(demoToastMessages.editCampaign)}
                    className="flex-1 lg:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => showToast('В реальной версии эта кнопка публикует кампанию и начинает автоматический подбор инфлюенсеров.')}
                    className="flex-1 lg:flex-none bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Опубликовать
                  </button>
                </div>
              </div>
            </div>
          ))}

          {mockMyCampaigns.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-12 text-center">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                У вас пока нет кампаний
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Создайте свою первую кампанию для автоматического поиска инфлюенсеров
              </p>
              <button
                onClick={() => showToast(demoToastMessages.createCampaign)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Создать кампанию
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
