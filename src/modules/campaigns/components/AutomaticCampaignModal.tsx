import React, { useState } from 'react';
import { X, Zap, Settings, Target, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { automaticCampaignService, DEFAULT_AUTOMATIC_SETTINGS, type AutomaticSettings } from '../services/automaticCampaignService';
import type { Campaign } from '../../../core/types';
import { CONTENT_TYPES } from '../../../core/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  advertiserId: string;
  onCampaignCreated: () => void;
}

const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'VK', 'Telegram'];
const COUNTRIES = ['Россия', 'США', 'Казахстан', 'Беларусь', 'Германия', 'Франция'];

export function AutomaticCampaignModal({ isOpen, onClose, advertiserId, onCampaignCreated }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    budget: { min: 10000, max: 100000, currency: 'RUB' },
    preferences: {
      platforms: [] as string[],
      contentTypes: [] as string[],
      audienceSize: { min: 10000, max: 1000000 },
      demographics: { countries: [] as string[] },
    },
    timeline: {
      startDate: '',
      endDate: '',
    },
  });

  const [automaticSettings, setAutomaticSettings] = useState<AutomaticSettings>(DEFAULT_AUTOMATIC_SETTINGS);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!formData.title || !formData.brand || !formData.description) {
      toast.error('Заполните обязательные поля');
      return;
    }

    if (formData.preferences.platforms.length === 0) {
      toast.error('Выберите хотя бы одну платформу');
      return;
    }

    if (formData.preferences.contentTypes.length === 0) {
      toast.error('Выберите хотя бы один тип контента');
      return;
    }

    if (!formData.timeline.startDate || !formData.timeline.endDate) {
      toast.error('Укажите сроки кампании');
      return;
    }

    setIsLoading(true);

    try {
      const campaign = await automaticCampaignService.createAutomaticCampaign(
        {
          advertiser_id: advertiserId,
          ...formData,
        } as any,
        automaticSettings
      );

      toast.success('Автоматическая кампания создана');
      onCampaignCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error(error.message || 'Ошибка создания кампании');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Автоматическая кампания</h2>
              <p className="text-sm text-gray-500">
                ИИ подберет инфлюенсеров и отправит предложения автоматически
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => setStep(s)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    step >= s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s}
                </button>
                {s < 3 && <div className={`flex-1 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Основная информация</h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Название кампании <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Например: Продвижение нового продукта"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Бренд <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Название бренда"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Описание <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={4}
                  placeholder="Опишите вашу кампанию, цели и требования к контенту"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Бюджет от (₽)</label>
                  <input
                    type="number"
                    value={formData.budget.min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: { ...formData.budget, min: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Бюджет до (₽)</label>
                  <input
                    type="number"
                    value={formData.budget.max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        budget: { ...formData.budget, max: Number(e.target.value) },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Дата начала <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.timeline.startDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeline: { ...formData.timeline, startDate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Дата окончания <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.timeline.endDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        timeline: { ...formData.timeline, endDate: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Targeting */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Таргетинг</h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Платформы <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            platforms: toggleArrayItem(formData.preferences.platforms, platform),
                          },
                        })
                      }
                      className={`px-4 py-2 rounded-lg border ${
                        formData.preferences.platforms.includes(platform)
                          ? 'bg-blue-50 border-blue-600 text-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Типы контента <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            contentTypes: toggleArrayItem(formData.preferences.contentTypes, type),
                          },
                        })
                      }
                      className={`px-4 py-2 rounded-lg border ${
                        formData.preferences.contentTypes.includes(type)
                          ? 'bg-blue-50 border-blue-600 text-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Страны аудитории</label>
                <div className="flex flex-wrap gap-2">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          preferences: {
                            ...formData.preferences,
                            demographics: {
                              ...formData.preferences.demographics,
                              countries: toggleArrayItem(formData.preferences.demographics.countries, country),
                            },
                          },
                        })
                      }
                      className={`px-4 py-2 rounded-lg border ${
                        formData.preferences.demographics.countries.includes(country)
                          ? 'bg-blue-50 border-blue-600 text-blue-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {country}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Минимальная аудитория</label>
                  <input
                    type="number"
                    value={formData.preferences.audienceSize.min}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          audienceSize: {
                            ...formData.preferences.audienceSize,
                            min: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Максимальная аудитория</label>
                  <input
                    type="number"
                    value={formData.preferences.audienceSize.max}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferences: {
                          ...formData.preferences,
                          audienceSize: {
                            ...formData.preferences.audienceSize,
                            max: Number(e.target.value),
                          },
                        },
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="1000000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Auto Settings */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Настройки автоподбора</h3>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Целевое количество инфлюенсеров
                </label>
                <input
                  type="number"
                  value={automaticSettings.targetInfluencerCount}
                  onChange={(e) =>
                    setAutomaticSettings({
                      ...automaticSettings,
                      targetInfluencerCount: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min={1}
                  max={50}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Система отправит предложения лучшим {automaticSettings.targetInfluencerCount} инфлюенсерам
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Минимальный рейтинг</label>
                <input
                  type="number"
                  value={automaticSettings.minRating}
                  onChange={(e) =>
                    setAutomaticSettings({
                      ...automaticSettings,
                      minRating: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                  min={0}
                  max={5}
                  step={0.5}
                />
                <p className="text-xs text-gray-500 mt-1">Рейтинг от 0 до 5 звезд</p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={automaticSettings.autoReplacement}
                    onChange={(e) =>
                      setAutomaticSettings({
                        ...automaticSettings,
                        autoReplacement: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Автоматическая замена выбывших инфлюенсеров</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Если инфлюенсер откажется, система автоматически предложит следующему по рейтингу
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Веса для оценки инфлюенсеров</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Количество подписчиков</span>
                    <span className="text-sm font-medium">{automaticSettings.scoringWeights.followers}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Вовлеченность</span>
                    <span className="text-sm font-medium">{automaticSettings.scoringWeights.engagement}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Рейтинг</span>
                    <span className="text-sm font-medium">{automaticSettings.scoringWeights.rating}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Завершенные кампании</span>
                    <span className="text-sm font-medium">
                      {automaticSettings.scoringWeights.completedCampaigns}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Назад
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
              Отмена
            </button>
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {isLoading ? 'Создание...' : 'Создать автокампанию'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
