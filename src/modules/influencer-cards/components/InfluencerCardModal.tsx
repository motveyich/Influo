import React, { useState, useEffect } from 'react';
import { InfluencerCard } from '../../../core/types';
import { influencerCardService } from '../services/influencerCardService';
import { useTranslation } from '../../../hooks/useTranslation';
import { X, Save, AlertCircle, Plus, Trash2, Instagram, Youtube, Twitter, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface InfluencerCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCard?: InfluencerCard | null;
  userId: string;
  onCardSaved: (card: InfluencerCard) => void;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'twitter', label: 'Twitter', icon: Twitter },
  { value: 'tiktok', label: 'TikTok', icon: Zap },
  { value: 'multi', label: 'Multi-Platform', icon: Zap }
];

const CONTENT_TYPES = [
  'Post', 'Story', 'Reel', 'Video', 'Live Stream', 'IGTV', 
  'Shorts', 'Tweet', 'Thread', 'Review', 'Unboxing', 'Tutorial'
];

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany',
  'France', 'Spain', 'Italy', 'Netherlands', 'Brazil', 'Mexico', 'India'
];

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
const INTERESTS = [
  'Fashion', 'Beauty', 'Lifestyle', 'Travel', 'Food', 'Fitness',
  'Technology', 'Gaming', 'Music', 'Art', 'Business', 'Education'
];

export function InfluencerCardModal({ 
  isOpen, 
  onClose, 
  currentCard, 
  userId, 
  onCardSaved 
}: InfluencerCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  // Form state
  const [formData, setFormData] = useState({
    platform: 'instagram' as const,
    reach: {
      followers: 0,
      averageViews: 0,
      engagementRate: 0
    },
    audienceDemographics: {
      ageGroups: {} as Record<string, number>,
      genderSplit: { male: 50, female: 50, other: 0 },
      topCountries: [] as string[],
      interests: [] as string[]
    },
    serviceDetails: {
      contentTypes: [] as string[],
      pricing: {
        post: 0,
        story: 0,
        reel: 0,
        video: 0
      },
      availability: true,
      responseTime: '24 hours',
      description: '',
      deliveryTime: '3-5 days',
      revisions: 2
    }
  });

  useEffect(() => {
    if (currentCard) {
      setFormData({
        platform: currentCard.platform,
        reach: currentCard.reach,
        audienceDemographics: currentCard.audienceDemographics,
        serviceDetails: currentCard.serviceDetails
      });
    } else {
      // Reset form for new card
      setFormData({
        platform: 'instagram',
        reach: { followers: 0, averageViews: 0, engagementRate: 0 },
        audienceDemographics: {
          ageGroups: {},
          genderSplit: { male: 50, female: 50, other: 0 },
          topCountries: [],
          interests: []
        },
        serviceDetails: {
          contentTypes: [],
          pricing: { post: 0, story: 0, reel: 0, video: 0 },
          availability: true,
          responseTime: '24 hours',
          description: '',
          deliveryTime: '3-5 days',
          revisions: 2
        }
      });
    }
    setErrors({});
  }, [currentCard, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.reach.followers <= 0) {
      newErrors.followers = t('influencerCards.validation.followersRequired');
    }

    if (formData.reach.engagementRate < 0 || formData.reach.engagementRate > 100) {
      newErrors.engagementRate = t('influencerCards.validation.engagementInvalid');
    }

    if (formData.serviceDetails.contentTypes.length === 0) {
      newErrors.contentTypes = t('influencerCards.validation.contentTypesRequired');
    }

    if (!formData.serviceDetails.description || formData.serviceDetails.description.trim().length < 10) {
      newErrors.description = t('influencerCards.validation.descriptionTooShort');
    }

    if (formData.audienceDemographics.topCountries.length === 0) {
      newErrors.countries = t('influencerCards.validation.countriesRequired');
    }

    if (Object.values(formData.serviceDetails.pricing).every(price => price === 0)) {
      newErrors.pricing = t('influencerCards.validation.pricingRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед сохранением');
      return;
    }

    setIsLoading(true);
    try {
      const cardData: Partial<InfluencerCard> = {
        userId,
        ...formData
      };

      let savedCard: InfluencerCard;
      if (currentCard) {
        savedCard = await influencerCardService.updateCard(currentCard.id, cardData);
        toast.success(t('influencerCards.success.updated'));
      } else {
        savedCard = await influencerCardService.createCard(cardData);
        toast.success(t('influencerCards.success.created'));
      }

      onCardSaved(savedCard);
      onClose();
    } catch (error: any) {
      console.error('Failed to save card:', error);
      toast.error(error.message || t('influencerCards.errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContentTypeToggle = (contentType: string) => {
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        contentTypes: prev.serviceDetails.contentTypes.includes(contentType)
          ? prev.serviceDetails.contentTypes.filter(type => type !== contentType)
          : [...prev.serviceDetails.contentTypes, contentType]
      }
    }));
  };

  const handleCountryToggle = (country: string) => {
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        topCountries: prev.audienceDemographics.topCountries.includes(country)
          ? prev.audienceDemographics.topCountries.filter(c => c !== country)
          : [...prev.audienceDemographics.topCountries, country]
      }
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        interests: prev.audienceDemographics.interests.includes(interest)
          ? prev.audienceDemographics.interests.filter(i => i !== interest)
          : [...prev.audienceDemographics.interests, interest]
      }
    }));
  };

  const handleAgeGroupChange = (ageGroup: string, percentage: number) => {
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        ageGroups: {
          ...prev.audienceDemographics.ageGroups,
          [ageGroup]: percentage
        }
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentCard ? t('influencerCards.editCard') : t('influencerCards.createCard')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-8">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('influencerCards.platform')} *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {PLATFORMS.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, platform: platform.value as any }))}
                    className={`p-3 border rounded-lg flex flex-col items-center space-y-2 transition-colors ${
                      formData.platform === platform.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-sm font-medium">{platform.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reach Metrics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('influencerCards.reachEngagement')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подписчики *
                </label>
                <input
                  type="number"
                  value={formData.reach.followers}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reach: { ...prev.reach, followers: parseInt(e.target.value) || 0 }
                  }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.followers ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="10000"
                />
                {errors.followers && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.followers}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Средние просмотры
                </label>
                <input
                  type="number"
                  value={formData.reach.averageViews}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reach: { ...prev.reach, averageViews: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="5000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Уровень вовлеченности (%) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.reach.engagementRate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reach: { ...prev.reach, engagementRate: parseFloat(e.target.value) || 0 }
                  }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.engagementRate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="3.5"
                />
                {errors.engagementRate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.engagementRate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('influencerCards.serviceDetails')}</h3>
            
            {/* Content Types */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('influencerCards.contentTypes')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {CONTENT_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleContentTypeToggle(type)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.serviceDetails.contentTypes.includes(type)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              {errors.contentTypes && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.contentTypes}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('influencerCards.serviceDescription')} *
              </label>
              <textarea
                value={formData.serviceDetails.description}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  serviceDetails: { ...prev.serviceDetails, description: e.target.value }
                }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Опишите ваши услуги, стиль и что делает вас уникальным..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('influencerCards.pricing')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(formData.serviceDetails.pricing).map(([type, price]) => (
                  <div key={type}>
                    <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                      {type}
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        serviceDetails: {
                          ...prev.serviceDetails,
                          pricing: {
                            ...prev.serviceDetails.pricing,
                            [type]: parseInt(e.target.value) || 0
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
              {errors.pricing && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.pricing}
                </p>
              )}
            </div>

            {/* Additional Service Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('influencerCards.responseTime')}
                </label>
                <select
                  value={formData.serviceDetails.responseTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    serviceDetails: { ...prev.serviceDetails, responseTime: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="1 hour">{t('time.within1Hour')}</option>
                  <option value="24 hours">{t('time.within24Hours')}</option>
                  <option value="48 hours">{t('time.within48Hours')}</option>
                  <option value="1 week">{t('time.within1Week')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('influencerCards.deliveryTime')}
                </label>
                <select
                  value={formData.serviceDetails.deliveryTime}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    serviceDetails: { ...prev.serviceDetails, deliveryTime: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="1-2 days">{t('time.days1to2')}</option>
                  <option value="3-5 days">{t('time.days3to5')}</option>
                  <option value="1 week">{t('time.week1')}</option>
                  <option value="2 weeks">{t('time.weeks2')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('influencerCards.revisionsIncluded')}
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.serviceDetails.revisions}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    serviceDetails: { ...prev.serviceDetails, revisions: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Audience Demographics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('influencerCards.audienceDemographics')}</h3>
            
            {/* Target Countries */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('influencerCards.targetCountries')} *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {COUNTRIES.map((country) => (
                  <button
                    key={country}
                    type="button"
                    onClick={() => handleCountryToggle(country)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.audienceDemographics.topCountries.includes(country)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {country}
                  </button>
                ))}
              </div>
              {errors.countries && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.countries}
                </p>
              )}
            </div>

            {/* Interests */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('influencerCards.audienceInterests')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                      formData.audienceDemographics.interests.includes(interest)
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Age Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('influencerCards.ageDistribution')}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {AGE_GROUPS.map((ageGroup) => (
                  <div key={ageGroup}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {ageGroup}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics.ageGroups[ageGroup] || 0}
                      onChange={(e) => handleAgeGroupChange(ageGroup, parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Сохранить карточку'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}