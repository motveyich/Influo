import React from 'react';
import { AutoCampaign } from '../../../core/types';
import { X, DollarSign, Users, Target, Calendar, CheckSquare, MessageCircle, Briefcase, Globe } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GENDER_LABELS } from '../../../core/constants';

interface AutoCampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: AutoCampaign;
}

export function AutoCampaignDetailsModal({ isOpen, onClose, campaign }: AutoCampaignDetailsModalProps) {
  if (!isOpen) return null;

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'draft':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">Черновик</span>;
      case 'active':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Активна</span>;
      case 'closed':
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">Набор завершён</span>;
      case 'completed':
        return <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">Завершена</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{campaign.title}</h2>
              {getStatusBadge()}
            </div>
            {campaign.description && (
              <p className="text-gray-600 mt-2">{campaign.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-blue-600 font-medium mb-1">Отправлено</div>
              <div className="text-2xl font-bold text-blue-900">{campaign.sentOffersCount}</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-green-600 font-medium mb-1">Принято</div>
              <div className="text-2xl font-bold text-green-900">{campaign.acceptedOffersCount}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-purple-600 font-medium mb-1">Завершено</div>
              <div className="text-2xl font-bold text-purple-900">{campaign.completedOffersCount}</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-orange-600 font-medium mb-1">Цель</div>
              <div className="text-2xl font-bold text-orange-900">{campaign.targetInfluencersCount}</div>
            </div>
          </div>

          {/* Budget & Audience */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                Бюджет
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Диапазон на интеграцию</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {campaign.budgetMin.toLocaleString()} - {campaign.budgetMax.toLocaleString()} ₽
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                Аудитория
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Размер аудитории</div>
                <div className="text-xl font-bold text-gray-900 mt-1">
                  {campaign.audienceMin.toLocaleString()} - {campaign.audienceMax.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Platforms & Content Types */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600" />
              Платформы и форматы
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <div className="text-sm text-gray-600 mb-2">Платформы</div>
                <div className="flex flex-wrap gap-2">
                  {campaign.platforms.map(platform => (
                    <span key={platform} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-2">Форматы контента</div>
                <div className="flex flex-wrap gap-2">
                  {campaign.contentTypes.map(type => (
                    <span key={type} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Demographics */}
          {(campaign.targetAgeGroups.length > 0 || campaign.targetGenders.length > 0 || campaign.targetCountries.length > 0 || campaign.targetAudienceInterests.length > 0) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-green-600" />
                Демография и интересы аудитории
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {campaign.targetAgeGroups.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Возрастные группы</div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.targetAgeGroups.map(age => (
                        <span key={age} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {age}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.targetGenders.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Гендеры</div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.targetGenders.map(gender => (
                        <span key={gender} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {GENDER_LABELS[gender as keyof typeof GENDER_LABELS] || gender}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.targetCountries.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Страны</div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.targetCountries.map(country => (
                        <span key={country} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.targetAudienceInterests.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Интересы аудитории</div>
                    <div className="flex flex-wrap gap-2">
                      {campaign.targetAudienceInterests.map(interest => (
                        <span key={interest} className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product Categories */}
          {campaign.productCategories.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-purple-600" />
                Категории товаров
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {campaign.productCategories.map(category => (
                    <span key={category} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Settings */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageCircle className="w-5 h-5 mr-2 text-blue-600" />
              Настройки коммуникации
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${campaign.enableChat ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <span className="text-gray-900 font-medium">
                  {campaign.enableChat ? 'Инфлюенсеры могут написать в чат' : 'Прямые сообщения отключены'}
                </span>
              </div>
            </div>
          </div>

          {/* Dates */}
          {(campaign.startDate || campaign.endDate) && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-orange-600" />
                Сроки
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                {campaign.startDate && (
                  <div>
                    <div className="text-sm text-gray-600">Начало</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {new Date(campaign.startDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                )}
                {campaign.endDate && (
                  <div>
                    <div className="text-sm text-gray-600">Окончание</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                      {new Date(campaign.endDate).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500 space-y-1">
              <div>Создана: {formatDistanceToNow(parseISO(campaign.createdAt), { addSuffix: true, locale: ru })}</div>
              <div>Обновлена: {formatDistanceToNow(parseISO(campaign.updatedAt), { addSuffix: true, locale: ru })}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
