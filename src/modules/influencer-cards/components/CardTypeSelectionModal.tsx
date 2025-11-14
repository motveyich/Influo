import React from 'react';
import { X, Users, Target, Instagram, Briefcase } from 'lucide-react';
import { UserProfile } from '../../../core/types';

interface CardTypeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'influencer' | 'advertiser') => void;
  profile: UserProfile | null;
}

export function CardTypeSelectionModal({ isOpen, onClose, onSelectType, profile }: CardTypeSelectionModalProps) {
  const canCreateInfluencerCard = profile?.profileCompletion.basicInfo && profile?.profileCompletion.influencerSetup;
  const canCreateAdvertiserCard = profile?.profileCompletion.basicInfo && profile?.profileCompletion.advertiserSetup;

  const handleSelectInfluencer = () => {
    if (!canCreateInfluencerCard) {
      return;
    }
    onSelectType('influencer');
  };

  const handleSelectAdvertiser = () => {
    if (!canCreateAdvertiserCard) {
      return;
    }
    onSelectType('advertiser');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Выберите тип карточки
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 mb-6">
            Выберите тип карточки, которую хотите создать:
          </p>

          {/* Influencer Card Option */}
          <button
            onClick={handleSelectInfluencer}
            disabled={!canCreateInfluencerCard}
            className={`w-full p-4 border-2 rounded-lg transition-all duration-200 ${
              canCreateInfluencerCard
                ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                canCreateInfluencerCard ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Instagram className={`w-6 h-6 ${
                  canCreateInfluencerCard ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className={`text-lg font-semibold ${
                  canCreateInfluencerCard ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Карточка инфлюенсера
                </h3>
                <p className={`text-sm ${
                  canCreateInfluencerCard ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Предложите свои услуги рекламодателям
                </p>
                {!canCreateInfluencerCard && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Требует заполнения профиля инфлюенсера
                    </span>
                  </div>
                )}
              </div>
              {canCreateInfluencerCard && (
                <div className="text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              )}
            </div>
          </button>

          {/* Advertiser Card Option */}
          <button
            onClick={handleSelectAdvertiser}
            disabled={!canCreateAdvertiserCard}
            className={`w-full p-4 border-2 rounded-lg transition-all duration-200 ${
              canCreateAdvertiserCard
                ? 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                canCreateAdvertiserCard ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Briefcase className={`w-6 h-6 ${
                  canCreateAdvertiserCard ? 'text-blue-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="flex-1 text-left">
                <h3 className={`text-lg font-semibold ${
                  canCreateAdvertiserCard ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  Карточка рекламодателя
                </h3>
                <p className={`text-sm ${
                  canCreateAdvertiserCard ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  Найдите инфлюенсеров для кампании
                </p>
                {!canCreateAdvertiserCard && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      Требует заполнения профиля рекламодателя
                    </span>
                  </div>
                )}
              </div>
              {canCreateAdvertiserCard && (
                <div className="text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
              )}
            </div>
          </button>

          {/* Help Text */}
          {(!canCreateInfluencerCard && !canCreateAdvertiserCard) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-yellow-600 mt-0.5">⚠️</div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">
                    Завершите настройку профиля
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Для создания карточек необходимо заполнить соответствующие разделы профиля.
                  </p>
                  <button
                    onClick={() => window.location.href = '/profiles'}
                    className="mt-2 text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
                  >
                    Перейти к настройкам профиля →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}