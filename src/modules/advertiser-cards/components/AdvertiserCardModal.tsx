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
    targetAudience: {
      description: '',
      interests: [] as string[],
      ageRange: [18, 35] as [number, number],
      ageGroups: {} as Record<string, number>,
      genderSplit: { male: 50, female: 50, other: 0 },
      countries: [] as string[],
      topCountries: [] as Array<{country: string; percentage: number}>
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
    },
    paymentInfo: {
      bankAccount: '',
      cardNumber: '',
      paypalEmail: '',
      cryptoAddress: '',
      accountHolder: ''
    },
    blacklistedCategories: [] as string[]
  });

  useEffect(() => {
    if (currentCard) {
      // Convert old format to new format
      const oldTopCountries = currentCard.targetAudience.countries || [];
      const convertedCountries = oldTopCountries.slice(0, 3).map((country, index) => ({
        country,
        percentage: index === 0 ? 50 : index === 1 ? 30 : 20
      }));

      setFormData({
        companyName: currentCard.companyName,
        campaignTitle: currentCard.campaignTitle,
        campaignDescription: currentCard.campaignDescription,
        platform: currentCard.platform as any,
        budget: {
          amount: currentCard.budget.amount || 0,
          currency: currentCard.budget.currency
        },
        targetAudience: {
          description: currentCard.targetAudience.description,
          interests: currentCard.targetAudience.interests || [],
          ageRange: currentCard.targetAudience.ageRange,
          ageGroups: currentCard.targetAudience.ageGroups || {},
          genderSplit: currentCard.targetAudience.genderSplit || { male: 50, female: 50, other: 0 },
          countries: currentCard.targetAudience.countries,
          topCountries: convertedCountries
        },
        serviceFormat: currentCard.serviceFormat || [],
        campaignDuration: currentCard.campaignDuration,
        influencerRequirements: currentCard.influencerRequirements,
        contactInfo: currentCard.contactInfo,
        paymentInfo: currentCard.paymentInfo || {
          bankAccount: '',
          cardNumber: '',
          paypalEmail: '',
          cryptoAddress: '',
          accountHolder: ''
        },
        blacklistedCategories: currentCard.blacklistedCategories || []
      });
    } else {
      // Reset form for new card
      setFormData({
        companyName: '',
        campaignTitle: '',
        campaignDescription: '',
        platform: 'vk',
        budget: { amount: 0, currency: 'RUB' },
        targetAudience: {
          description: '',
          interests: [],
          ageRange: [18, 35],
          ageGroups: {},
          genderSplit: { male: 50, female: 50, other: 0 },
          countries: [],
          topCountries: []
        },
        serviceFormat: [],
        campaignDuration: { startDate: '', endDate: '' },
        influencerRequirements: { minFollowers: 0, maxFollowers: 0, minEngagementRate: 0 },
        contactInfo: { email: '', phone: '', website: '' },
        paymentInfo: {
          bankAccount: '',
          cardNumber: '',
          paypalEmail: '',
          cryptoAddress: '',
          accountHolder: ''
        },
        blacklistedCategories: []
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

    if (formData.targetAudience.topCountries.length === 0) {
      newErrors.countries = 'Выберите хотя бы одну страну';
    } else if (formData.targetAudience.topCountries.length > 3) {
      newErrors.countries = 'Можно выбрать максимум 3 страны';
    }

    // Validate country percentages
    const countrySum = formData.targetAudience.topCountries.reduce((sum, item) => sum + item.percentage, 0);
    if (countrySum > 100) {
      newErrors.countries = `Сумма процентов по странам не может превышать 100% (текущая: ${countrySum}%)`;
    }

    // Validate age group percentages
    const ageGroupSum = Object.values(formData.targetAudience.ageGroups).reduce((sum, percentage) => sum + percentage, 0);
    if (ageGroupSum > 100) {
      newErrors.ageGroups = `Сумма процентов по возрастным группам не может превышать 100% (текущая: ${ageGroupSum}%)`;
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

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        interests: prev.targetAudience.interests.includes(interest)
          ? prev.targetAudience.interests.filter(i => i !== interest)
          : [...prev.targetAudience.interests, interest]
      }
    }));
  };

  const handleBlacklistToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      blacklistedCategories: prev.blacklistedCategories.includes(category)
        ? prev.blacklistedCategories.filter(c => c !== category)
        : [...prev.blacklistedCategories, category]
    }));
  };

  const handleAgeGroupChange = (ageGroup: string, percentage: number) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        ageGroups: {
          ...prev.targetAudience.ageGroups,
          [ageGroup]: Math.max(0, Math.min(100, percentage))
        }
      }
    }));
  };

  const handleCountryAdd = () => {
    if (formData.targetAudience.topCountries.length >= 3) {
      toast.error('Можно выбрать максимум 3 страны');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        topCountries: [
          ...prev.targetAudience.topCountries,
          { country: COUNTRIES[0], percentage: 0 }
        ]
      }
    }));
  };

  const handleCountryRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        topCountries: prev.targetAudience.topCountries.filter((_, i) => i !== index)
      }
    }));
  };

  const handleCountryChange = (index: number, field: 'country' | 'percentage', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        topCountries: prev.targetAudience.topCountries.map((item, i) => 
          i === index 
            ? { ...item, [field]: field === 'percentage' ? Math.max(0, Math.min(100, Number(value))) : value }
            : item
        )
      }
    }));
  };

  const getAgeGroupSum = () => {
    return Object.values(formData.targetAudience.ageGroups).reduce((sum, percentage) => sum + percentage, 0);
  };

  const getCountrySum = () => {
    return formData.targetAudience.topCountries.reduce((sum, item) => sum + item.percentage, 0);
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

          {/* Target Audience Demographics */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Целевая аудитория</h3>
            
            <div className="mb-6">
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

            {/* Countries */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  География аудитории * (максимум 3 страны)
                </label>
                <button
                  type="button"
                  onClick={handleCountryAdd}
                  disabled={formData.targetAudience.topCountries.length >= 3}
                  className="bg-purple-600 text-white px-3 py-1 rounded-md text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить страну</span>
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.targetAudience.topCountries.map((item, index) => (
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
                      formData.targetAudience.interests.includes(interest)
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
                        value={formData.targetAudience.ageGroups[ageGroup] || 0}
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
                      value={formData.targetAudience.genderSplit.male}
                      onChange={(e) => {
                        const male = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - male;
                        const female = Math.min(remaining, formData.targetAudience.genderSplit.female);
                        const other = remaining - female;
                        
                        setFormData(prev => ({
                          ...prev,
                          targetAudience: {
                            ...prev.targetAudience,
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
                      value={formData.targetAudience.genderSplit.female}
                      onChange={(e) => {
                        const female = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - female;
                        const male = Math.min(remaining, formData.targetAudience.genderSplit.male);
                        const other = remaining - male;
                        
                        setFormData(prev => ({
                          ...prev,
                          targetAudience: {
                            ...prev.targetAudience,
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
                      value={formData.targetAudience.genderSplit.other}
                      onChange={(e) => {
                        const other = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                        const remaining = 100 - other;
                        const male = Math.min(remaining, formData.targetAudience.genderSplit.male);
                        const female = remaining - male;
                        
                        setFormData(prev => ({
                          ...prev,
                          targetAudience: {
                            ...prev.targetAudience,
                            genderSplit: { male, female, other }
                          }
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  Общий процент: {formData.targetAudience.genderSplit.male + formData.targetAudience.genderSplit.female + formData.targetAudience.genderSplit.other}% / 100%
                </div>
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

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Реквизиты для оплаты (опционально)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Банковский счет
                </label>
                <input
                  type="text"
                  value={formData.paymentInfo.bankAccount}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, bankAccount: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="40817810099910004312"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Номер карты
                </label>
                <input
                  type="text"
                  value={formData.paymentInfo.cardNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, cardNumber: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="2202 2020 2020 2020"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PayPal Email
                </label>
                <input
                  type="email"
                  value={formData.paymentInfo.paypalEmail}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, paypalEmail: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="payments@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Владелец счета/карты
                </label>
                <input
                  type="text"
                  value={formData.paymentInfo.accountHolder}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentInfo: { ...prev.paymentInfo, accountHolder: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="ООО Компания"
                />
              </div>
            </div>
          </div>

          {/* Blacklisted Categories */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Чёрный список категорий</h3>
            <p className="text-sm text-gray-600 mb-3">
              Выберите категории товаров/секторов бизнеса, с которыми вы НЕ хотите сотрудничать:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
              {INTERESTS.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => handleBlacklistToggle(category)}
                  className={`px-3 py-2 text-sm rounded-md border transition-colors text-left ${
                    formData.blacklistedCategories.includes(category)
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            {formData.blacklistedCategories.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-gray-600 mb-2">Исключенные категории:</p>
                <div className="flex flex-wrap gap-1">
                  {formData.blacklistedCategories.map((category, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => handleBlacklistToggle(category)}
                        className="ml-1 text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
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