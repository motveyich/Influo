import React, { useState } from 'react';
import { AutoCampaignFormData } from '../../../core/types';
import { autoCampaignService } from '../services/autoCampaignService';
import { PLATFORMS, CONTENT_TYPES, COUNTRIES, PRODUCT_CATEGORIES, AUDIENCE_INTERESTS } from '../../../core/constants';
import { X, DollarSign, Users, Target, Calendar, CheckSquare, MessageCircle, Briefcase, Globe, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

interface AutoCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  advertiserId: string;
}

export function AutoCampaignModal({ isOpen, onClose, onSuccess, advertiserId }: AutoCampaignModalProps) {
  const [formData, setFormData] = useState<AutoCampaignFormData>({
    title: '',
    description: '',
    budgetMin: 100,
    budgetMax: 500,
    audienceMin: 1000,
    audienceMax: 10000,
    targetInfluencersCount: 10,
    contentTypes: ['post'],
    platforms: ['Instagram'],
    targetCountries: [],
    targetAudienceInterests: [],
    productCategories: [],
    enableChat: true,
    startDate: '',
    endDate: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Введите название кампании';
    }

    if (formData.budgetMin <= 0) {
      newErrors.budgetMin = 'Минимальный бюджет должен быть больше 0';
    }

    if (formData.budgetMax < formData.budgetMin) {
      newErrors.budgetMax = 'Максимальный бюджет должен быть >= минимального';
    }

    if (formData.audienceMin <= 0) {
      newErrors.audienceMin = 'Минимальная аудитория должна быть больше 0';
    }

    if (formData.audienceMax < formData.audienceMin) {
      newErrors.audienceMax = 'Максимальная аудитория должна быть >= минимальной';
    }

    if (formData.targetInfluencersCount <= 0) {
      newErrors.targetInfluencersCount = 'Целевое количество должно быть больше 0';
    }

    if (formData.contentTypes.length === 0) {
      newErrors.contentTypes = 'Выберите хотя бы один тип контента';
    }

    if (formData.platforms.length === 0) {
      newErrors.platforms = 'Выберите хотя бы одну платформу';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await autoCampaignService.createCampaign(advertiserId, formData);
      toast.success('Автокомпания создана!');
      onSuccess();
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast.error('Не удалось создать автокомпанию');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleContentType = (type: string) => {
    if (formData.contentTypes.includes(type)) {
      setFormData({
        ...formData,
        contentTypes: formData.contentTypes.filter(t => t !== type)
      });
    } else {
      setFormData({
        ...formData,
        contentTypes: [...formData.contentTypes, type]
      });
    }
  };

  const togglePlatform = (platform: string) => {
    if (formData.platforms.includes(platform)) {
      setFormData({
        ...formData,
        platforms: formData.platforms.filter(p => p !== platform)
      });
    } else {
      setFormData({
        ...formData,
        platforms: [...formData.platforms, platform]
      });
    }
  };


  const toggleCountry = (country: string) => {
    if (formData.targetCountries.includes(country)) {
      setFormData({ ...formData, targetCountries: formData.targetCountries.filter(c => c !== country) });
    } else {
      setFormData({ ...formData, targetCountries: [...formData.targetCountries, country] });
    }
  };

  const toggleInterest = (interest: string) => {
    if (formData.targetAudienceInterests.includes(interest)) {
      setFormData({ ...formData, targetAudienceInterests: formData.targetAudienceInterests.filter(i => i !== interest) });
    } else {
      setFormData({ ...formData, targetAudienceInterests: [...formData.targetAudienceInterests, interest] });
    }
  };

  const toggleCategory = (category: string) => {
    if (formData.productCategories.includes(category)) {
      setFormData({ ...formData, productCategories: formData.productCategories.filter(c => c !== category) });
    } else {
      setFormData({ ...formData, productCategories: [...formData.productCategories, category] });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Создать автокомпанию</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Название кампании *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Например: Продвижение нового продукта"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание / ТЗ
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Опишите задачу для инфлюенсеров..."
            />
          </div>

          {/* Budget Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Диапазон бюджета (₽) *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={formData.budgetMin}
                  onChange={(e) => setFormData({ ...formData, budgetMin: Number(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.budgetMin ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Мин"
                />
                {errors.budgetMin && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetMin}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={formData.budgetMax}
                  onChange={(e) => setFormData({ ...formData, budgetMax: Number(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.budgetMax ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Макс"
                />
                {errors.budgetMax && (
                  <p className="mt-1 text-sm text-red-600">{errors.budgetMax}</p>
                )}
              </div>
            </div>
          </div>

          {/* Audience Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Диапазон аудитории инфлюенсеров *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={formData.audienceMin}
                  onChange={(e) => setFormData({ ...formData, audienceMin: Number(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.audienceMin ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Мин подписчиков"
                />
                {errors.audienceMin && (
                  <p className="mt-1 text-sm text-red-600">{errors.audienceMin}</p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  value={formData.audienceMax}
                  onChange={(e) => setFormData({ ...formData, audienceMax: Number(e.target.value) })}
                  className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                    errors.audienceMax ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Макс подписчиков"
                />
                {errors.audienceMax && (
                  <p className="mt-1 text-sm text-red-600">{errors.audienceMax}</p>
                )}
              </div>
            </div>
          </div>

          {/* Target Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-1" />
              Целевое количество инфлюенсеров *
            </label>
            <input
              type="number"
              value={formData.targetInfluencersCount}
              onChange={(e) => setFormData({ ...formData, targetInfluencersCount: Number(e.target.value) })}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 ${
                errors.targetInfluencersCount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Например: 10"
            />
            {errors.targetInfluencersCount && (
              <p className="mt-1 text-sm text-red-600">{errors.targetInfluencersCount}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Система отправит +25% предложений (овербукинг)
            </p>
          </div>

          {/* Content Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CheckSquare className="w-4 h-4 inline mr-1" />
              Типы контента *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleContentType(type)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.contentTypes.includes(type)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.contentTypes && (
              <p className="mt-1 text-sm text-red-600">{errors.contentTypes}</p>
            )}
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Платформы *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.platforms.includes(platform)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
            {errors.platforms && (
              <p className="mt-1 text-sm text-red-600">{errors.platforms}</p>
            )}
          </div>

          {/* Dates */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Сроки кампании (опционально)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Начало</label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Окончание</label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Demographics - Countries */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 inline mr-1" />
              Целевые страны (опционально)
            </label>
            <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => toggleCountry(country)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    formData.targetCountries.includes(country)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>

          {/* Audience Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Heart className="w-4 h-4 inline mr-1" />
              Интересы аудитории (опционально)
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Выберите интересы аудитории инфлюенсеров. Система будет учитывать эти интересы при подборе.
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
              {AUDIENCE_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                    formData.targetAudienceInterests.includes(interest)
                      ? 'bg-pink-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Product Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Категории товаров (опционально)
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-3">
              {PRODUCT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${
                    formData.productCategories.includes(category)
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Enable Chat */}
          <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <input
              type="checkbox"
              id="enableChat"
              checked={formData.enableChat}
              onChange={(e) => setFormData({ ...formData, enableChat: e.target.checked })}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="enableChat" className="flex-1 cursor-pointer">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  Разрешить инфлюенсерам обращаться в чат
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Если включено, инфлюенсеры смогут связаться с вами через чат из деталей предложения
              </p>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
