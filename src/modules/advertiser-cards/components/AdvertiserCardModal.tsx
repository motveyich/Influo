import React, { useState, useEffect } from 'react';
import { AdvertiserCard } from '../../../core/types';
import { advertiserCardService } from '../services/advertiserCardService';
import { X, Save, AlertCircle, Plus, Trash2, Calendar, DollarSign, Building, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvertiserCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCard?: AdvertiserCard | null;
  userId: string;
  onCardSaved: (card: AdvertiserCard) => void;
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

const SERVICE_FORMATS = [
  'Пост',
  'Видео', 
  'Рилс',
  'Упоминание в видео'
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
    platform: 'vk' as const,
    budget: {
      amount: 0,
      currency: 'RUB'
    },
    serviceFormat: [] as string[],
    campaignDuration: {
      startDate: '',
      endDate: ''
    },
    influencerRequirements: {
      minFollowers: 0,
      maxFollowers: 0,
      minEngagementRate: 0
    },
    contactInfo: {
      email: '',
      phone: '',
      website: ''
    }
  });

  useEffect(() => {
    if (currentCard) {
      setFormData({
        companyName: currentCard.companyName,
        campaignTitle: currentCard.campaignTitle,
        campaignDescription: currentCard.campaignDescription,
        platform: currentCard.platform as any,
        budget: {
          amount: currentCard.budget.amount || 0,
          currency: currentCard.budget.currency
        },
        serviceFormat: currentCard.serviceFormat || [],
        campaignDuration: currentCard.campaignDuration,
        influencerRequirements: currentCard.influencerRequirements,
        contactInfo: currentCard.contactInfo
      });
    } else {
      // Reset form for new card
      setFormData({
        companyName: '',
        campaignTitle: '',
        campaignDescription: '',
        platform: 'vk',
        budget: { amount: 0, currency: 'RUB' },
        serviceFormat: [],
        campaignDuration: { startDate: '', endDate: '' },
        influencerRequirements: { minFollowers: 0, maxFollowers: 0, minEngagementRate: 0 },
        contactInfo: { email: '', phone: '', website: '' }
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

    if (formData.budget.amount <= 0) {
      newErrors.budget = 'Укажите корректную сумму бюджета';
    }

    if (formData.serviceFormat.length === 0) {
      newErrors.serviceFormat = 'Выберите хотя бы один формат услуги';
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
        isActive: true
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
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Описание задачи/бриф *
              </label>
              <textarea
                value={formData.campaignDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignDescription: e.target.value }))}
                rows={4}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.campaignDescription ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Опишите задачу, цели кампании, требования к контенту..."
              />
              {errors.campaignDescription && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.campaignDescription}
                </p>
              )}
            </div>
          </div>

          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Площадка *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PLATFORMS.map((platform) => (
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
              ))}
            </div>
          </div>

          {/* Service Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Формат услуги *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SERVICE_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleArrayToggle(
                    formData.serviceFormat,
                    format,
                    (newFormats) => setFormData(prev => ({ ...prev, serviceFormat: newFormats }))
                  )}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                    formData.serviceFormat.includes(format)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {format}
                </button>
              ))}
            </div>
            {errors.serviceFormat && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.serviceFormat}
              </p>
            )}
          </div>

          {/* Budget */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Бюджет</h3>
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
                    placeholder="50000"
                  />
                </div>
                {errors.budget && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.budget}
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
                  <option value="RUB">₽ Рубли</option>
                  <option value="USD">$ Доллары</option>
                  <option value="EUR">€ Евро</option>
                </select>
              </div>
            </div>
          </div>

          {/* Campaign Duration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Сроки проведения кампании</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {errors.timeline && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.timeline}
              </p>
            )}
          </div>

          {/* Influencer Requirements */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Требования к инфлюенсеру</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимальное количество подписчиков
                </label>
                <input
                  type="number"
                  value={formData.influencerRequirements.minFollowers}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    influencerRequirements: { ...prev.influencerRequirements, minFollowers: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Максимальное количество подписчиков
                </label>
                <input
                  type="number"
                  value={formData.influencerRequirements.maxFollowers}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    influencerRequirements: { ...prev.influencerRequirements, maxFollowers: parseInt(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Минимальная вовлеченность (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.influencerRequirements.minEngagementRate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    influencerRequirements: { ...prev.influencerRequirements, minEngagementRate: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="3.0"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Контактные данные</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  placeholder="+7-xxx-xxx-xx-xx"
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