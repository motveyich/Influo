import React from 'react';
import { X, MapPin, Star, Users, TrendingUp, DollarSign, Calendar, Package, ShieldBan } from 'lucide-react';
import { InfluencerCard } from '../../../core/types';
import { useTranslation } from '../../../hooks/useTranslation';

interface InfluencerCardDetailsModalProps {
  card: InfluencerCard;
  onClose: () => void;
}

export function InfluencerCardDetailsModal({ card, onClose }: InfluencerCardDetailsModalProps) {
  const { t } = useTranslation();

  const platformName = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    twitter: 'Twitter',
    multi: t('influencerCards.multiPlatform') || 'Несколько платформ'
  }[card.platform];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {t('influencerCards.cardDetails') || 'Детали карточки'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">{platformName}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                card.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {card.isActive ? t('influencerCards.active') : t('influencerCards.inactive')}
              </span>
            </div>

            <div className="flex items-center space-x-2 text-yellow-600">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-lg font-semibold">{card.rating.toFixed(1)}</span>
              <span className="text-gray-600">
                ({card.completedCampaigns} {t('influencerCards.completedCampaigns') || 'завершённых кампаний'})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-blue-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">{t('influencerCards.followers') || 'Подписчики'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {card.reach.followers.toLocaleString()}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-purple-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">{t('influencerCards.avgViews') || 'Средние просмотры'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {card.reach.averageViews.toLocaleString()}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-green-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="font-semibold">{t('influencerCards.engagement') || 'Вовлечённость'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {card.reach.engagementRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span>{t('influencerCards.audienceDemographics') || 'Демография аудитории'}</span>
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-700 mb-2">
                  {t('influencerCards.ageGroups') || 'Возрастные группы'}
                </h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(card.audienceDemographics.ageGroups).map(([age, percentage]) => (
                    <div key={age} className="bg-gray-100 rounded px-3 py-2">
                      <span className="text-sm font-medium text-gray-900">{age}:</span>
                      <span className="text-sm text-gray-600 ml-1">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-2">
                  {t('influencerCards.genderSplit') || 'Распределение по полу'}
                </h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(card.audienceDemographics.genderSplit).map(([gender, percentage]) => (
                    <div key={gender} className="bg-gray-100 rounded px-3 py-2">
                      <span className="text-sm font-medium text-gray-900">{gender}:</span>
                      <span className="text-sm text-gray-600 ml-1">{percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {card.audienceDemographics.topCountries.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{t('influencerCards.topCountries') || 'Топ страны'}</span>
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {card.audienceDemographics.topCountries.map((country, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {country}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {card.audienceDemographics.interests.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">
                    {t('influencerCards.interests') || 'Интересы аудитории'}
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {card.audienceDemographics.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Package className="w-5 h-5 text-gray-600" />
              <span>{t('influencerCards.services') || 'Услуги и цены'}</span>
            </h4>

            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-700 mb-2">
                  {t('influencerCards.contentTypes') || 'Типы контента'}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {card.serviceDetails.contentTypes.map((type, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{t('influencerCards.pricing') || 'Цены'}</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(card.serviceDetails.pricing).map(([service, price]) => (
                    <div key={service} className="bg-gray-100 rounded-lg px-4 py-3">
                      <span className="text-sm text-gray-600">{service}</span>
                      <p className="text-lg font-semibold text-gray-900">
                        {price.toLocaleString()} {card.serviceDetails.currency}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {card.serviceDetails.blacklistedProductCategories &&
               card.serviceDetails.blacklistedProductCategories.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <ShieldBan className="w-4 h-4 text-red-600" />
                    <span>{t('influencerCards.blacklisted') || 'Не работаю с категориями'}</span>
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {card.serviceDetails.blacklistedProductCategories.map((category, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="flex items-center space-x-2 text-gray-600 text-sm">
              <Calendar className="w-4 h-4" />
              <span>
                {t('influencerCards.created') || 'Создана'}: {new Date(card.createdAt).toLocaleDateString('ru-RU')}
              </span>
              {card.updatedAt && (
                <>
                  <span className="mx-2">•</span>
                  <span>
                    {t('influencerCards.updated') || 'Обновлена'}: {new Date(card.updatedAt).toLocaleDateString('ru-RU')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            {t('common.close') || 'Закрыть'}
          </button>
        </div>
      </div>
    </div>
  );
}
