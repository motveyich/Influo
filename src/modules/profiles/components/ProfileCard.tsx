import React from 'react';
import { UserProfile } from '../../../core/types';
import { Instagram, Youtube, Twitter } from 'lucide-react';
import { analytics } from '../../../core/analytics';

interface ProfileCardProps {
  profile: UserProfile;
  currentUserId?: string;
}

export function ProfileCard({ profile, currentUserId }: ProfileCardProps) {
  const handleProfileView = () => {
    if (currentUserId && currentUserId !== profile.userId) {
      analytics.trackProfileView(profile.userId, currentUserId);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getAccountTypeLabel = () => {
    if (profile.influencerData && profile.advertiserData) {
      return 'Инфлюенсер и рекламодатель';
    } else if (profile.influencerData) {
      return 'Инфлюенсер';
    } else if (profile.advertiserData) {
      return 'Рекламодатель';
    }
    return 'Пользователь';
  };

  return (
    <div 
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 cursor-pointer"
      onClick={handleProfileView}
    >
      {/* Header */}
      <div className="flex items-start space-x-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
          {profile.avatar ? (
            <img 
              src={profile.avatar} 
              alt={profile.fullName}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <span className="text-white font-semibold text-xl">
              {profile.fullName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">{profile.fullName}</h3>
            {profile.unifiedAccountInfo.isVerified && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">{getAccountTypeLabel()}</p>
          {profile.location && (
            <p className="text-xs text-gray-500">{profile.location}</p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{profile.bio}</p>
      )}

      {/* Social Media Links */}
      {profile.influencerData?.socialMediaLinks && profile.influencerData.socialMediaLinks.length > 0 && (
        <div className="flex space-x-3 mb-4">
          {profile.influencerData.socialMediaLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {getSocialIcon(link.platform)}
            </a>
          ))}
        </div>
      )}

      {/* Content Categories for Influencers */}
      {profile.influencerData?.contentCategories && profile.influencerData.contentCategories.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {profile.influencerData.contentCategories.slice(0, 3).map((category, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md"
              >
                {category}
              </span>
            ))}
            {profile.influencerData.contentCategories.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                +{profile.influencerData.contentCategories.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Company Info for Advertisers */}
      {profile.advertiserData?.companyName && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-900">{profile.advertiserData.companyName}</p>
          {profile.advertiserData.industry && (
            <p className="text-xs text-gray-600 capitalize">{profile.advertiserData.industry}</p>
          )}
        </div>
      )}

      {/* Metrics for Influencers */}
      {profile.influencerData?.metrics && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(profile.influencerData.metrics.totalFollowers)}
            </p>
            <p className="text-xs text-gray-600">Подписчики</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {profile.influencerData.metrics.engagementRate.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">Вовлеченность</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {formatNumber(profile.influencerData.metrics.averageViews)}
            </p>
            <p className="text-xs text-gray-600">Средние просмотры</p>
          </div>
        </div>
      )}

      {/* Budget Range for Advertisers */}
      {profile.advertiserData?.campaignPreferences.budgetRange && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Диапазон бюджета</span>
            <span className="text-sm font-medium text-gray-900">
              ${formatNumber(profile.advertiserData.campaignPreferences.budgetRange.min)} - 
              ${formatNumber(profile.advertiserData.campaignPreferences.budgetRange.max)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-gray-600">Предыдущие кампании</span>
            <span className="text-sm font-medium text-gray-900">
              {profile.advertiserData.previousCampaigns}
            </span>
          </div>
        </div>
      )}

      {/* Availability for Influencers */}
      {profile.influencerData && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          {profile.influencerData.availableForCollabs && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-green-600">Доступен для сотрудничества</span>
            </div>
          )}
        </div>
      )}

      {/* Profile Completion */}
      {!profile.profileCompletion.overallComplete && (
        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Заполнение профиля</span>
            <span className="text-sm font-medium text-gray-900">
              {profile.profileCompletion.completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${profile.profileCompletion.completionPercentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Legacy social media links handling */}
      {!profile.influencerData?.socialMediaLinks && (
        <div className="flex space-x-3 mb-4">
          {/* This section can be removed once all profiles are migrated */}
        </div>
      )}

      {/* Legacy metrics handling */}
      {!profile.influencerData?.metrics && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* This section can be removed once all profiles are migrated */}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors">
          Просмотреть профиль
        </button>
      </div>
    </div>
  );
}