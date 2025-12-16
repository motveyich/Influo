import React from 'react';
import { UserProfile } from '../core/types';
import { useTranslation } from '../hooks/useTranslation';
import { Lock, AlertCircle, User, Instagram, Briefcase } from 'lucide-react';

interface FeatureGateProps {
  profile: UserProfile | null;
  requiredSection?: 'basic' | 'influencer' | 'advertiser' | 'any';
  featureName: string;
  children: React.ReactNode;
  onCompleteProfile?: () => void;
}

export function FeatureGate({ 
  profile, 
  requiredSection = 'basic',
  featureName, 
  children, 
  onCompleteProfile 
}: FeatureGateProps) {
  const { t } = useTranslation();

  // Check access based on required section
  const hasAccess = () => {
    if (!profile?.profileCompletion) return false;

    switch (requiredSection) {
      case 'basic':
        return profile.profileCompletion.basicInfo;
      case 'influencer':
        return profile.profileCompletion.basicInfo && profile.profileCompletion.influencerSetup;
      case 'advertiser':
        return profile.profileCompletion.basicInfo && profile.profileCompletion.advertiserSetup;
      case 'any':
        return profile.profileCompletion.basicInfo &&
               (profile.profileCompletion.influencerSetup || profile.profileCompletion.advertiserSetup);
      default:
        return false;
    }
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  const getRequiredSectionInfo = () => {
    switch (requiredSection) {
      case 'basic':
        return {
          icon: <User className="w-8 h-8 text-gray-400" />,
          title: 'Заполните основную информацию профиля',
          description: 'Для доступа к функциям платформы необходимо заполнить основную информацию профиля.'
        };
      case 'influencer':
        return {
          icon: <Instagram className="w-8 h-8 text-gray-400" />,
          title: 'Настройте профиль инфлюенсера',
          description: 'Для доступа к функциям инфлюенсера необходимо заполнить соответствующий раздел профиля.'
        };
      case 'advertiser':
        return {
          icon: <Briefcase className="w-8 h-8 text-gray-400" />,
          title: 'Настройте профиль рекламодателя',
          description: 'Для доступа к функциям рекламодателя необходимо заполнить соответствующий раздел профиля.'
        };
      case 'any':
        return {
          icon: <Lock className="w-8 h-8 text-gray-400" />,
          title: 'Завершите настройку профиля',
          description: 'Для доступа к этой функции необходимо заполнить профиль инфлюенсера или рекламодателя.'
        };
      default:
        return {
          icon: <Lock className="w-8 h-8 text-gray-400" />,
          title: 'Доступ ограничен',
          description: 'Завершите заполнение профиля для доступа к этой функции.'
        };
    }
  };

  const sectionInfo = getRequiredSectionInfo();

  // Show gate if profile is incomplete
  return (
    <div className="bg-white rounded-lg shadow-md p-8 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        {sectionInfo.icon}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {sectionInfo.title}
      </h3>
      
      <p className="text-gray-600 mb-6">
        {sectionInfo.description}
      </p>

      {profile?.profileCompletion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Текущий прогресс заполнения: {profile.profileCompletion.completionPercentage}%
              </h4>
              <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${profile.profileCompletion.completionPercentage}%` }}
                ></div>
              </div>
              <ul className="space-y-1 text-sm text-blue-700">
                <li className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${profile.profileCompletion.basicInfo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Основная информация (50%)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${profile.profileCompletion.influencerSetup ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Инфлюенсер (25%)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${profile.profileCompletion.advertiserSetup ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span>Рекламодатель (25%)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {onCompleteProfile && (
        <button
          onClick={onCompleteProfile}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
        >
          Перейти к настройкам профиля
        </button>
      )}
    </div>
  );
}