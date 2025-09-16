import React, { useState, useEffect } from 'react';
import { InfluencerCard } from '../../../core/types';
import { influencerCardService } from '../services/influencerCardService';
import { useTranslation } from '../../../hooks/useTranslation';
import { PRODUCT_CATEGORIES } from '../../../core/constants';
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
  { value: 'vk', label: 'ВКонтакте' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'ok', label: 'Одноклассники' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'rutube', label: 'RuTube' },
  { value: 'yandex_zen', label: 'Яндекс.Дзен' },
  { value: 'likee', label: 'Likee' }
];

const CONTENT_TYPES = [
  'Пост',
  'Видео', 
  'Рилс',
  'Упоминание в видео'
];

const COUNTRIES = [
  'Россия',
  'Беларусь', 
  'Казахстан',
  'Украина',
  'Узбекистан',
  'Киргизия',
  'Таджикистан',
  'Армения',
  'Азербайджан',
  'Молдова',
  'Грузия',
  'США',
  'Германия',
  'Великобритания',
  'Франция',
  'Италия',
  'Испания',
  'Канада',
  'Австралия',
  'Турция',
  'Польша',
  'Чехия'
];

const AGE_GROUPS = ['13-17', '18-24', '25-34', '35-44', '45-54', '55+'];

const INTERESTS = [
  'Мода и стиль',
  'Красота и косметика', 
  'Образ жизни',
  'Путешествия и туризм',
  'Еда и кулинария',
  'Фитнес и здоровье',
  'Спорт',
  'Технологии и гаджеты',
  'Игры и киберспорт',
  'Музыка и развлечения',
  'Искусство и творчество',
  'Бизнес и предпринимательство',
  'Образование и обучение',
  'Наука и исследования',
  'Автомобили и транспорт',
  'Недвижимость и дизайн интерьера',
  'Финансы и инвестиции',
  'Родительство и семья',
  'Домашние животные',
  'Книги и литература',
  'Кино и сериалы',
  'Фотография',
  'Дизайн и архитектура',
  'Политика и общество',
  'Экология и устойчивое развитие',
  'Психология и саморазвитие',
  'Медицина и здравоохранение',
  'Юмор и комедия',
  'Новости и журналистика',
  'Религия и духовность'
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
    platform: 'vk' as const,
    reach: {
      followers: 0,
      engagementRate: 0
    },
    audienceDemographics: {
      ageGroups: {} as Record<string, number>,
      genderSplit: { male: 50, female: 50, other: 0 },
      topCountries: [] as Array<{country: string; percentage: number}>,
      interests: [] as string[]
    },
    serviceDetails: {
      contentTypes: [] as string[],
      pricing: {
        post: 0,
        video: 0,
        reel: 0,
        mention: 0
      },
      blacklistedProductCategories: [] as string[],
      availability: true,
      description: ''
    }
  });

  useEffect(() => {
    if (currentCard) {
      // Convert old format to new format
      const oldTopCountries = currentCard.audienceDemographics.topCountries || [];
      const convertedCountries = oldTopCountries.slice(0, 3).map((country, index) => ({
        country,
        percentage: index === 0 ? 50 : index === 1 ? 30 : 20
      }));

      setFormData({
        platform: currentCard.platform as any,
        reach: {
          followers: currentCard.reach.followers || 0,
          engagementRate: currentCard.reach.engagementRate || 0
        },
        audienceDemographics: {
          ageGroups: currentCard.audienceDemographics.ageGroups || {},
          genderSplit: currentCard.audienceDemographics.genderSplit || { male: 50, female: 50, other: 0 },
          topCountries: convertedCountries,
          interests: currentCard.audienceDemographics.interests || []
        },
        serviceDetails: {
          contentTypes: currentCard.serviceDetails.contentTypes || [],
          pricing: {
            post: currentCard.serviceDetails.pricing?.post || 0,
            video: currentCard.serviceDetails.pricing?.video || 0,
            reel: currentCard.serviceDetails.pricing?.reel || 0,
            mention: (currentCard.serviceDetails.pricing as any)?.mention || 0
          },
          blacklistedProductCategories: currentCard.serviceDetails.blacklistedProductCategories || [],
          availability: currentCard.serviceDetails.availability ?? true,
          description: currentCard.serviceDetails.description || ''
        }
      });
    } else {
      // Reset form for new card
      setFormData({
        platform: 'vk',
        reach: { followers: 0, engagementRate: 0 },
        audienceDemographics: {
          ageGroups: {},
          genderSplit: { male: 50, female: 50, other: 0 },
          topCountries: [],
          interests: []
        },
        serviceDetails: {
          contentTypes: [],
          pricing: { post: 0, video: 0, reel: 0, mention: 0 },
          blacklistedProductCategories: [],
          availability: true,
          description: ''
        }
      });
    }
    setErrors({});
  }, [currentCard, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.reach.followers <= 0) {
      newErrors.followers = 'Количество подписчиков должно быть больше 0';
    }

    if (formData.reach.engagementRate < 0 || formData.reach.engagementRate > 100) {
      newErrors.engagementRate = 'Процент вовлеченности должен быть от 0 до 100';
    }

    if (formData.serviceDetails.contentTypes.length === 0) {
      newErrors.contentTypes = 'Выберите хотя бы один тип контента';
    }

    if (!formData.serviceDetails.description || formData.serviceDetails.description.trim().length < 10) {
      newErrors.description = 'Описание услуг должно содержать минимум 10 символов';
    }

    if (formData.audienceDemographics.topCountries.length === 0) {
      newErrors.countries = 'Выберите хотя бы одну страну';
    } else if (formData.audienceDemographics.topCountries.length > 3) {
      newErrors.countries = 'Можно выбрать максимум 3 страны';
    }

    // Validate country percentages
    const countrySum = formData.audienceDemographics.topCountries.reduce((sum, item) => sum + item.percentage, 0);
    if (countrySum > 100) {
      newErrors.countries = `Сумма процентов по странам не может превышать 100% (текущая: ${countrySum}%)`;
    }

    // Validate age group percentages
    const ageGroupSum = Object.values(formData.audienceDemographics.ageGroups).reduce((sum, percentage) => sum + percentage, 0);
    if (ageGroupSum > 100) {
      newErrors.ageGroups = `Сумма процентов по возрастным группам не может превышать 100% (текущая: ${ageGroupSum}%)`;
    }

    if (Object.values(formData.serviceDetails.pricing).every(price => price === 0)) {
      newErrors.pricing = 'Установите цену хотя бы для одной услуги';
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
      // Convert to old format for database compatibility
      const cardData: Partial<InfluencerCard> = {
        userId,
        platform: formData.platform,
        reach: {
          followers: formData.reach.followers,
          averageViews: 0, // Remove this field
          engagementRate: formData.reach.engagementRate
        },
        audienceDemographics: {
          ageGroups: formData.audienceDemographics.ageGroups,
          genderSplit: formData.audienceDemographics.genderSplit,
          topCountries: formData.audienceDemographics.topCountries.map(item => item.country),
          interests: formData.audienceDemographics.interests
        },
        serviceDetails: {
          ...formData.serviceDetails,
          pricing: {
            post: formData.serviceDetails.pricing.post,
            story: 0, // Remove story pricing
            reel: formData.serviceDetails.pricing.reel,
            video: formData.serviceDetails.pricing.video
          },
          blacklistedProductCategories: formData.serviceDetails.blacklistedProductCategories
        }
      };

      let savedCard: InfluencerCard;
      if (currentCard) {
        savedCard = await influencerCardService.updateCard(currentCard.id, cardData);
        toast.success('Карточка обновлена успешно!');
      } else {
        savedCard = await influencerCardService.createCard(cardData);
        toast.success('Карточка создана успешно!');
      }

      onCardSaved(savedCard);
      onClose();
    } catch (error: any) {
      console.error('Failed to save card:', error);
      toast.error(error.message || 'Не удалось сохранить карточку');
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
          [ageGroup]: Math.max(0, Math.min(100, percentage))
        }
      }
    }));
  };

  const handleCountryAdd = () => {
    if (formData.audienceDemographics.topCountries.length >= 3) {
      toast.error('Можно выбрать максимум 3 страны');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        topCountries: [
          ...prev.audienceDemographics.topCountries,
          { country: COUNTRIES[0], percentage: 0 }
        ]
      }
    }));
  };

  const handleCountryRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        topCountries: prev.audienceDemographics.topCountries.filter((_, i) => i !== index)
      }
    }));
  };

  const handleCountryChange = (index: number, field: 'country' | 'percentage', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      audienceDemographics: {
        ...prev.audienceDemographics,
        topCountries: prev.audienceDemographics.topCountries.map((item, i) => 
          i === index 
            ? { ...item, [field]: field === 'percentage' ? Math.max(0, Math.min(100, Number(value))) : value }
            : item
        )
      }
    }));
  };

  const getAgeGroupSum = () => {
    return Object.values(formData.audienceDemographics.ageGroups).reduce((sum, percentage) => sum + percentage, 0);
  };

  const getCountrySum = () => {
    return formData.audienceDemographics.topCountries.reduce((sum, item) => sum + item.percentage, 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentCard ? 'Редактировать карточку инфлюенсера' : 'Создать карточку инфлюенсера'}
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
              Площадка *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => {
                return (
                  <button
                    key={platform.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, platform: platform.value as any }))}
                    className={`p-3 border rounded-lg flex items-center justify-center transition-colors ${
                      formData.platform === platform.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-sm font-medium text-center">{platform.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reach Metrics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Охват и вовлеченность</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество подписчиков *
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
                  Процент вовлеченности (ER) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.reach.engagementRate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reach: { ...prev.reach, engagementRate: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }
                  }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.engagementRate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="3.5"
                />
                <p className="text-xs text-gray-500 mt-1">От 0 до 100%</p>
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Детали услуг</h3>
            
            {/* Content Types */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Типы контента *
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
                Описание услуг *
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
                Цены за услуги (₽) *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Пост
                  </label>
                  <input
                    type="number"
                    value={formData.serviceDetails.pricing.post}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      serviceDetails: {
                        ...prev.serviceDetails,
                        pricing: {
                          ...prev.serviceDetails.pricing,
                          post: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Видео
                  </label>
                  <input
                    type="number"
                    value={formData.serviceDetails.pricing.video}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      serviceDetails: {
                        ...prev.serviceDetails,
                        pricing: {
                          ...prev.serviceDetails.pricing,
                          video: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Рилс
                  </label>
                  <input
                    type="number"
                    value={formData.serviceDetails.pricing.reel}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      serviceDetails: {
                        ...prev.serviceDetails,
                        pricing: {
                          ...prev.serviceDetails.pricing,
                          reel: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Упоминание в видео
                  </label>
                  <input
                    type="number"
                    value={formData.serviceDetails.pricing.mention}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      serviceDetails: {
                        ...prev.serviceDetails,
                        pricing: {
                          ...prev.serviceDetails.pricing,
                          mention: parseInt(e.target.value) || 0
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
              {errors.pricing && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.pricing}
                </p>
              )}
            </div>

            {/* Blacklisted Product Categories */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Черный список категорий продуктов
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Выберите категории продуктов, с которыми вы НЕ хотите работать
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {PRODUCT_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      const isSelected = formData.serviceDetails.blacklistedProductCategories.includes(category);
                      setFormData(prev => ({
                        ...prev,
                        serviceDetails: {
                          ...prev.serviceDetails,
                          blacklistedProductCategories: isSelected
                            ? prev.serviceDetails.blacklistedProductCategories.filter(c => c !== category)
                            : [...prev.serviceDetails.blacklistedProductCategories, category]
                        }
                      }));
                    }}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                      formData.serviceDetails.blacklistedProductCategories.includes(category)
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {formData.serviceDetails.blacklistedProductCategories.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Выбранные категории для исключения:</p>
                  <div className="flex flex-wrap gap-1">
                    {formData.serviceDetails.blacklistedProductCategories.map((category, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Audience Demographics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Демография аудитории</h3>
            
            {/* Countries */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  География аудитории * (максимум 3 страны)
                </label>
                <button
                  type="button"
                  onClick={handleCountryAdd}
                  disabled={formData.audienceDemographics.topCountries.length >= 3}
                  className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить страну</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.audienceDemographics.topCountries.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <select
                      value={item.country}
                      onChange={(e) => handleCountryChange(index, 'country', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      {COUNTRIES.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.percentage}
                      onChange={(e) => handleCountryChange(index, 'percentage', e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="0"
                    />
                    <span className="text-sm text-gray-600">%</span>
                    <button
                      type="button"
                      onClick={() => handleCountryRemove(index)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-2 text-sm text-gray-600">
                Общий процент: {getCountrySum()}% / 100%
                {getCountrySum() > 100 && (
                  <span className="text-red-600 font-medium ml-2">Превышение лимита!</span>
                )}
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
                Интересы аудитории
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
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

            {/* Age Groups and Gender Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Age Groups */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Распределение по возрастным группам (%)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {AGE_GROUPS.map((ageGroup) => (
                    <div key={ageGroup}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {ageGroup} лет
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
                
                <div className="mt-2 text-sm text-gray-600">
                  Общий процент: {getAgeGroupSum()}% / 100%
                  {getAgeGroupSum() > 100 && (
                    <span className="text-red-600 font-medium ml-2">Превышение лимита!</span>
                  )}
                </div>
                
                {errors.ageGroups && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.ageGroups}
                  </p>
                )}
              </div>

              {/* Gender Split */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Распределение по полу (%)
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Мужчины
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics.genderSplit.male}
                      onChange={(e) => {
                        const male = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - male;
                        const female = Math.min(remaining, formData.audienceDemographics.genderSplit.female);
                        const other = remaining - female;
                        
                        setFormData(prev => ({
                          ...prev,
                          audienceDemographics: {
                            ...prev.audienceDemographics,
                            genderSplit: { male, female, other }
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Женщины
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics.genderSplit.female}
                      onChange={(e) => {
                        const female = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - female;
                        const male = Math.min(remaining, formData.audienceDemographics.genderSplit.male);
                        const other = remaining - male;
                        
                        setFormData(prev => ({
                          ...prev,
                          audienceDemographics: {
                            ...prev.audienceDemographics,
                            genderSplit: { male, female, other }
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Другое
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.audienceDemographics.genderSplit.other}
                      onChange={(e) => {
                        const other = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - other;
                        const male = Math.min(remaining, formData.audienceDemographics.genderSplit.male);
                        const female = remaining - male;
                        
                        setFormData(prev => ({
                          ...prev,
                          audienceDemographics: {
                            ...prev.audienceDemographics,
                            genderSplit: { male, female, other }
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  Общий процент: {formData.audienceDemographics.genderSplit.male + formData.audienceDemographics.genderSplit.female + formData.audienceDemographics.genderSplit.other}% / 100%
                </div>
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
            Отмена
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