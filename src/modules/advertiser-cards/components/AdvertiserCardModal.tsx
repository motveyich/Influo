import React, { useState, useEffect } from 'react';
import { AdvertiserCard } from '../../../core/types';
import { advertiserCardService } from '../services/advertiserCardService';
import { X, Save, AlertCircle, Calendar, DollarSign, Building } from 'lucide-react';
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

const PRODUCT_CATEGORIES = [
  'Косметика',
  'Химия для дома',
  'Электроника',
  'Одежда',
  'Информационный продукт',
  'Курсы',
  'Заведения',
  'Продукты питания',
  'Напитки',
  'Спортивные товары',
  'Детские товары',
  'Товары для дома',
  'Мебель',
  'Автомобили',
  'Недвижимость',
  'Финансовые услуги',
  'Страхование',
  'Медицинские услуги',
  'Образовательные услуги',
  'Туристические услуги',
  'Развлечения',
  'Игры и приложения',
  'Программное обеспечение',
  'Книги и издания',
  'Музыка',
  'Фильмы и сериалы',
  'Подписки и сервисы',
  'Криптовалюта',
  'Инвестиции',
  'Ювелирные изделия',
  'Часы',
  'Аксессуары',
  'Обувь',
  'Сумки',
  'Парфюмерия',
  'Средства по уходу',
  'Витамины и БАДы',
  'Спортивное питание',
  'Диетические продукты',
  'Органические продукты',
  'Веганские продукты',
  'Товары для животных',
  'Садоводство',
  'Инструменты',
  'Строительные материалы',
  'Канцелярские товары',
  'Хобби и рукоделие',
  'Музыкальные инструменты',
  'Фототехника',
  'Видеотехника',
  'Компьютеры',
  'Мобильные устройства',
  'Бытовая техника',
  'Климатическая техника',
  'Освещение',
  'Текстиль',
  'Постельное белье',
  'Посуда',
  'Кухонная утварь',
  'Другое'
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
    productCategories: [] as string[],
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
    targetAudience: {
      interests: [] as string[]
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
        productCategories: currentCard.productCategories || [],
        budget: {
          amount: currentCard.budget.amount || 0,
          currency: currentCard.budget.currency
        },
        serviceFormat: currentCard.serviceFormat || [],
        campaignDuration: currentCard.campaignDuration,
        influencerRequirements: currentCard.influencerRequirements,
        targetAudience: {
          interests: currentCard.targetAudience?.interests || []
        },
        contactInfo: currentCard.contactInfo
      });
    } else {
      // Reset form for new card
      setFormData({
        companyName: '',
        campaignTitle: '',
        campaignDescription: '',
        platform: 'vk',
        productCategories: [],
        budget: { amount: 0, currency: 'RUB' },
        serviceFormat: [],
        campaignDuration: { startDate: '', endDate: '' },
        influencerRequirements: { minFollowers: 0, maxFollowers: 0, minEngagementRate: 0 },
        targetAudience: { interests: [] },
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

    if (formData.productCategories.length === 0) {
      newErrors.productCategories = 'Выберите хотя бы одну категорию продукта';
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-sm font-medium text-center">{platform.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Product Categories */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Категории продукта *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {PRODUCT_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleArrayToggle(
                    formData.productCategories,
                    category,
                    (newCategories) => setFormData(prev => ({ ...prev, productCategories: newCategories }))
                  )}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                    formData.productCategories.includes(category)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {errors.productCategories && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.productCategories}
              </p>
            )}
          </div>

          {/* Target Audience Interests */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Интересы аудитории
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {PRODUCT_CATEGORIES.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => handleArrayToggle(
                    formData.targetAudience.interests,
                    interest,
                    (newInterests) => setFormData(prev => ({
                      ...prev,
                      targetAudience: { ...prev.targetAudience, interests: newInterests }
                    }))
                  )}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                    formData.targetAudience.interests.includes(interest)
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>

          {/* Service Format */}
          <div className="mb-6">
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
            <div className="grid grid-cols-3 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    contactInfo: { ...prev.contactInfo, website: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Сохранение...' : 'Сохранить карточку'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}