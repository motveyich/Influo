import React, { useState, useEffect } from 'react';
import { AdvertiserCard } from '../../../core/types';
import { advertiserCardService } from '../services/advertiserCardService';
import { X, Save, AlertCircle, Plus, Trash2, Calendar, DollarSign, Building } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvertiserCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCard?: AdvertiserCard | null;
  userId: string;
  onCardSaved: (card: AdvertiserCard) => void;
}

const PRODUCT_TYPES = [
  { value: 'fashion', label: 'Мода и красота' },
  { value: 'technology', label: 'Технологии' },
  { value: 'food', label: 'Еда и напитки' },
  { value: 'travel', label: 'Путешествия' },
  { value: 'fitness', label: 'Фитнес и здоровье' },
  { value: 'lifestyle', label: 'Образ жизни' },
  { value: 'automotive', label: 'Автомобили' },
  { value: 'finance', label: 'Финансы' },
  { value: 'education', label: 'Образование' },
  { value: 'other', label: 'Другое' }
];

const CAMPAIGN_FORMATS = [
  'post', 'story', 'reel', 'video', 'live', 'unboxing', 'review', 'tutorial', 'integration'
];

const PLATFORMS = ['instagram', 'youtube', 'twitter', 'tiktok'];
const COUNTRIES = ['US', 'UK', 'CA', 'AU', 'DE', 'FR', 'ES', 'IT', 'NL', 'BR', 'MX', 'IN'];
const GENDERS = ['male', 'female', 'non-binary'];
const CONTENT_THEMES = [
  'fashion', 'beauty', 'lifestyle', 'travel', 'food', 'fitness', 'technology', 
  'gaming', 'music', 'art', 'business', 'education', 'reviews', 'unboxing'
];

export function AdvertiserCardModal({ 
  isOpen, 
  onClose, 
  currentCard, 
  userId, 
  onCardSaved 
}: AdvertiserCardModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    companyName: '',
    campaignTitle: '',
    campaignDescription: '',
    productType: 'fashion',
    budget: {
      type: 'range' as 'fixed' | 'range',
      amount: 0,
      min: 0,
      max: 0,
      currency: 'USD'
    },
    targetAudience: {
      description: '',
      categories: [] as string[],
      ageRange: [18, 35] as [number, number],
      genders: [] as string[],
      countries: [] as string[]
    },
    campaignFormat: [] as string[],
    campaignDuration: {
      startDate: '',
      endDate: '',
      isFlexible: false
    },
    influencerRequirements: {
      platforms: [] as string[],
      minReach: 0,
      maxReach: 0,
      contentThemes: [] as string[],
      engagementRate: 0,
      locations: [] as string[]
    },
    contactInfo: {
      email: '',
      phone: '',
      website: '',
      preferredContact: 'email' as 'email' | 'phone' | 'chat'
    },
    priority: 'medium' as 'low' | 'medium' | 'high',
    applicationDeadline: ''
  });

  useEffect(() => {
    if (currentCard) {
      setFormData({
        companyName: currentCard.companyName,
        campaignTitle: currentCard.campaignTitle,
        campaignDescription: currentCard.campaignDescription,
        productType: currentCard.productType,
        budget: currentCard.budget,
        targetAudience: currentCard.targetAudience,
        campaignFormat: currentCard.campaignFormat,
        campaignDuration: currentCard.campaignDuration,
        influencerRequirements: currentCard.influencerRequirements,
        contactInfo: currentCard.contactInfo,
        priority: currentCard.priority,
        applicationDeadline: currentCard.applicationDeadline || ''
      });
    } else {
      // Reset form for new card
      setFormData({
        companyName: '',
        campaignTitle: '',
        campaignDescription: '',
        productType: 'fashion',
        budget: { type: 'range', amount: 0, min: 0, max: 0, currency: 'USD' },
        targetAudience: {
          description: '',
          categories: [],
          ageRange: [18, 35],
          genders: [],
          countries: []
        },
        campaignFormat: [],
        campaignDuration: { startDate: '', endDate: '', isFlexible: false },
        influencerRequirements: {
          platforms: [],
          minReach: 0,
          maxReach: 0,
          contentThemes: [],
          engagementRate: 0,
          locations: []
        },
        contactInfo: { email: '', phone: '', website: '', preferredContact: 'email' },
        priority: 'medium',
        applicationDeadline: ''
      });
    }
    setErrors({});
  }, [currentCard, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Название компании обязательно';
    }

    if (!formData.campaignTitle.trim()) {
      newErrors.campaignTitle = 'Название кампании обязательно';
    }

    if (!formData.campaignDescription.trim()) {
      newErrors.campaignDescription = 'Описание кампании обязательно';
    } else if (formData.campaignDescription.length < 20) {
      newErrors.campaignDescription = 'Описание должно содержать минимум 20 символов';
    }

    if (formData.budget.type === 'fixed' && formData.budget.amount <= 0) {
      newErrors.budget = 'Укажите корректную сумму бюджета';
    }

    if (formData.budget.type === 'range') {
      if (formData.budget.min <= 0) {
        newErrors.minBudget = 'Минимальный бюджет должен быть больше 0';
      }
      if (formData.budget.max <= 0) {
        newErrors.maxBudget = 'Максимальный бюджет должен быть больше 0';
      }
      if (formData.budget.min > formData.budget.max) {
        newErrors.budget = 'Минимальный бюджет не может быть больше максимального';
      }
    }

    if (formData.campaignFormat.length === 0) {
      newErrors.campaignFormat = 'Выберите хотя бы один формат кампании';
    }

    if (formData.influencerRequirements.platforms.length === 0) {
      newErrors.platforms = 'Выберите хотя бы одну платформу';
    }

    if (formData.targetAudience.countries.length === 0) {
      newErrors.countries = 'Выберите хотя бы одну страну';
    }

    if (!formData.campaignDuration.startDate) {
      newErrors.startDate = 'Дата начала обязательна';
    }

    if (!formData.campaignDuration.endDate) {
      newErrors.endDate = 'Дата окончания обязательна';
    }

    if (formData.campaignDuration.startDate && formData.campaignDuration.endDate) {
      const startDate = new Date(formData.campaignDuration.startDate);
      const endDate = new Date(formData.campaignDuration.endDate);
      
      if (startDate >= endDate) {
        newErrors.timeline = 'Дата окончания должна быть после даты начала';
      }
    }

    if (!formData.contactInfo.email.trim()) {
      newErrors.email = 'Email для связи обязателен';
    } else if (!/\S+@\S+\.\S+/.test(formData.contactInfo.email)) {
      newErrors.email = 'Введите корректный email адрес';
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
      const cardData: Partial<AdvertiserCard> = {
        userId,
        ...formData,
        isPriority: formData.priority === 'high'
      };

      let savedCard: AdvertiserCard;
      if (currentCard) {
        savedCard = await advertiserCardService.updateCard(currentCard.id, cardData);
        toast.success('Карточка рекламодателя обновлена успешно!');
      } else {
        savedCard = await advertiserCardService.createCard(cardData);
        toast.success('Карточка рекламодателя создана успешно!');
      }

      onCardSaved(savedCard);
      onClose();
    } catch (error: any) {
      console.error('Failed to save advertiser card:', error);
      toast.error(error.message || 'Не удалось сохранить карточку');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArrayToggle = (array: string[], item: string, setter: (newArray: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {currentCard ? 'Редактировать карточку рекламодателя' : 'Создать карточку рекламодателя'}
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
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название компании/бренда *
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.companyName ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Введите название компании"
                  />
                </div>
                {errors.companyName && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип продукта/услуги *
                </label>
                <select
                  value={formData.productType}
                  onChange={(e) => setFormData(prev => ({ ...prev, productType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {PRODUCT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название кампании *
              </label>
              <input
                type="text"
                value={formData.campaignTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignTitle: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.campaignTitle ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Введите название кампании"
              />
              {errors.campaignTitle && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.campaignTitle}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание кампании *
              </label>
              <textarea
                value={formData.campaignDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignDescription: e.target.value }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.campaignDescription ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Опишите цели кампании, продукт/услугу, ожидания от сотрудничества..."
              />
              {errors.campaignDescription && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.campaignDescription}
                </p>
              )}
            </div>
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Бюджет</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип бюджета
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="fixed"
                      checked={formData.budget.type === 'fixed'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, type: e.target.value as 'fixed' | 'range' }
                      }))}
                      className="mr-2"
                    />
                    Фиксированная сумма
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="range"
                      checked={formData.budget.type === 'range'}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, type: e.target.value as 'fixed' | 'range' }
                      }))}
                      className="mr-2"
                    />
                    Диапазон
                  </label>
                </div>
              </div>

              {formData.budget.type === 'fixed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Сумма бюджета *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget.amount}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, amount: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          errors.budget ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="2500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.budget.currency}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, currency: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Минимальный бюджет *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget.min}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, min: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          errors.minBudget ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="1000"
                      />
                    </div>
                    {errors.minBudget && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.minBudget}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Максимальный бюджет *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="number"
                        value={formData.budget.max}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          budget: { ...prev.budget, max: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                          errors.maxBudget ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="5000"
                      />
                    </div>
                    {errors.maxBudget && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.maxBudget}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Валюта
                    </label>
                    <select
                      value={formData.budget.currency}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        budget: { ...prev.budget, currency: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              )}
              {errors.budget && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.budget}
                </p>
              )}
            </div>
          </div>

          {/* Campaign Format */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Формат рекламы</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {CAMPAIGN_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleArrayToggle(
                    formData.campaignFormat,
                    format,
                    (newFormats) => setFormData(prev => ({ ...prev, campaignFormat: newFormats }))
                  )}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    formData.campaignFormat.includes(format)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {format === 'post' ? 'Пост' :
                   format === 'story' ? 'Сторис' :
                   format === 'reel' ? 'Рилс' :
                   format === 'video' ? 'Видео' :
                   format === 'live' ? 'Прямой эфир' :
                   format === 'unboxing' ? 'Распаковка' :
                   format === 'review' ? 'Обзор' :
                   format === 'tutorial' ? 'Туториал' :
                   format === 'integration' ? 'Интеграция' : format}
                </button>
              ))}
            </div>
            {errors.campaignFormat && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.campaignFormat}
              </p>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Целевая аудитория</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание целевой аудитории
                </label>
                <textarea
                  value={formData.targetAudience.description}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    targetAudience: { ...prev.targetAudience, description: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Опишите вашу целевую аудиторию..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Возрастной диапазон: {formData.targetAudience.ageRange[0]} - {formData.targetAudience.ageRange[1]}
                </label>
                <div className="flex space-x-4">
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={formData.targetAudience.ageRange[0]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      targetAudience: {
                        ...prev.targetAudience,
                        ageRange: [parseInt(e.target.value), prev.targetAudience.ageRange[1]]
                      }
                    }))}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="13"
                    max="65"
                    value={formData.targetAudience.ageRange[1]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      targetAudience: {
                        ...prev.targetAudience,
                        ageRange: [prev.targetAudience.ageRange[0], parseInt(e.target.value)]
                      }
                    }))}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Целевые страны *
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.targetAudience.countries,
                        country,
                        (newCountries) => setFormData(prev => ({
                          ...prev,
                          targetAudience: { ...prev.targetAudience, countries: newCountries }
                        }))
                      )}
                      className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                        formData.targetAudience.countries.includes(country)
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
            </div>
          </div>

          {/* Campaign Duration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Сроки проведения кампании</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата начала *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.campaignDuration.startDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      campaignDuration: { ...prev.campaignDuration, startDate: e.target.value }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.startDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата окончания *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.campaignDuration.endDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      campaignDuration: { ...prev.campaignDuration, endDate: e.target.value }
                    }))}
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      errors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.endDate}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Срок подачи заявок
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={formData.applicationDeadline}
                    onChange={(e) => setFormData(prev => ({ ...prev, applicationDeadline: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Приоритет кампании
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="low">Низкий</option>
                  <option value="medium">Средний</option>
                  <option value="high">Высокий</option>
                </select>
              </div>
            </div>

            {errors.timeline && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.timeline}
              </p>
            )}

            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.campaignDuration.isFlexible}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    campaignDuration: { ...prev.campaignDuration, isFlexible: e.target.checked }
                  }))}
                  className="mr-2"
                />
                Гибкие сроки (возможно обсуждение)
              </label>
            </div>
          </div>

          {/* Influencer Requirements */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Требования к инфлюенсеру</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Платформы *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.influencerRequirements.platforms,
                        platform,
                        (newPlatforms) => setFormData(prev => ({
                          ...prev,
                          influencerRequirements: { ...prev.influencerRequirements, platforms: newPlatforms }
                        }))
                      )}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
                        formData.influencerRequirements.platforms.includes(platform)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
                {errors.platforms && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.platforms}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Минимальный охват
                  </label>
                  <input
                    type="number"
                    value={formData.influencerRequirements.minReach}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      influencerRequirements: { ...prev.influencerRequirements, minReach: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Максимальный охват
                  </label>
                  <input
                    type="number"
                    value={formData.influencerRequirements.maxReach}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      influencerRequirements: { ...prev.influencerRequirements, maxReach: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="1000000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Мин. вовлеченность (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.influencerRequirements.engagementRate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      influencerRequirements: { ...prev.influencerRequirements, engagementRate: parseFloat(e.target.value) || 0 }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="3.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тематика контента
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {CONTENT_THEMES.map((theme) => (
                    <button
                      key={theme}
                      type="button"
                      onClick={() => handleArrayToggle(
                        formData.influencerRequirements.contentThemes,
                        theme,
                        (newThemes) => setFormData(prev => ({
                          ...prev,
                          influencerRequirements: { ...prev.influencerRequirements, contentThemes: newThemes }
                        }))
                      )}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        formData.influencerRequirements.contentThemes.includes(theme)
                          ? 'bg-green-100 border-green-300 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {theme === 'fashion' ? 'Мода' :
                       theme === 'beauty' ? 'Красота' :
                       theme === 'lifestyle' ? 'Образ жизни' :
                       theme === 'travel' ? 'Путешествия' :
                       theme === 'food' ? 'Еда' :
                       theme === 'fitness' ? 'Фитнес' :
                       theme === 'technology' ? 'Технологии' :
                       theme === 'gaming' ? 'Игры' :
                       theme === 'music' ? 'Музыка' :
                       theme === 'art' ? 'Искусство' :
                       theme === 'business' ? 'Бизнес' :
                       theme === 'education' ? 'Образование' :
                       theme === 'reviews' ? 'Обзоры' :
                       theme === 'unboxing' ? 'Распаковка' : theme}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Контактные данные</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email для связи *
                </label>
                <input
                  type="email"
                  value={formData.contactInfo.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, email: e.target.value }
                  }))}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="partnerships@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, phone: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="+1-555-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Веб-сайт
                </label>
                <input
                  type="url"
                  value={formData.contactInfo.website}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, website: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Предпочтительный способ связи
                </label>
                <select
                  value={formData.contactInfo.preferredContact}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, preferredContact: e.target.value as any }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="email">Email</option>
                  <option value="phone">Телефон</option>
                  <option value="chat">Чат в платформе</option>
                </select>
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