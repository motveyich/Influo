import React, { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface IntegrationDetails {
  niche: string;
  productDescription: string;
  integrationFormat: string;
  integrationParameters: string;
}

interface IntegrationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: IntegrationDetails) => Promise<void>;
  existingDetails?: IntegrationDetails | null;
  isEditing?: boolean;
}

const NICHES = [
  'Мода и стиль',
  'Красота и косметика',
  'Здоровье и фитнес',
  'Еда и кулинария',
  'Путешествия',
  'Технологии и гаджеты',
  'Игры',
  'Образование',
  'Бизнес и финансы',
  'Музыка',
  'Спорт',
  'Развлечения',
  'Искусство и дизайн',
  'Дом и интерьер',
  'Автомобили',
  'Другое'
];

export function IntegrationDetailsModal({
  isOpen,
  onClose,
  onSubmit,
  existingDetails,
  isEditing = false
}: IntegrationDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<IntegrationDetails>({
    niche: '',
    productDescription: '',
    integrationFormat: '',
    integrationParameters: ''
  });

  useEffect(() => {
    if (existingDetails) {
      setFormData(existingDetails);
    }
  }, [existingDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.niche) {
      toast.error('Выберите нишу');
      return;
    }

    if (!formData.productDescription || formData.productDescription.length < 10) {
      toast.error('Описание продукта должно содержать минимум 10 символов');
      return;
    }

    if (!formData.integrationFormat || formData.integrationFormat.length < 10) {
      toast.error('Описание формата интеграции должно содержать минимум 10 символов');
      return;
    }

    try {
      setIsLoading(true);
      await onSubmit(formData);
      onClose();
    } catch (error: any) {
      console.error('Failed to submit integration details:', error);
      toast.error(error.message || 'Не удалось сохранить детали');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? 'Редактировать детали интеграции' : 'Детали интеграции'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Укажите информацию о рекламируемом продукте и желаемом формате интеграции
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Niche Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ниша <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.niche}
              onChange={(e) => setFormData({ ...formData, niche: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Выберите нишу</option>
              {NICHES.map((niche) => (
                <option key={niche} value={niche}>
                  {niche}
                </option>
              ))}
            </select>
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Описание рекламируемого продукта <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.productDescription}
              onChange={(e) => setFormData({ ...formData, productDescription: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Опишите продукт или услугу, которую вы хотите рекламировать..."
              required
              minLength={10}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Минимум 10 символов. Укажите ключевые особенности и преимущества продукта.
            </p>
          </div>

          {/* Integration Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Формат интеграции <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.integrationFormat}
              onChange={(e) => setFormData({ ...formData, integrationFormat: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: Пост в ленте, Stories, видеообзор, интеграция в ролик..."
              required
              minLength={10}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Минимум 10 символов. Опишите желаемый формат размещения рекламы.
            </p>
          </div>

          {/* Integration Parameters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Параметры интеграции
            </label>
            <textarea
              value={formData.integrationParameters}
              onChange={(e) => setFormData({ ...formData, integrationParameters: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Например: длительность видео, количество упоминаний, специальные требования..."
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Необязательно. Укажите дополнительные требования и параметры интеграции.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Совет:</p>
                <p>Чем подробнее вы опишете детали интеграции, тем проще инфлюенсеру будет понять ваши требования и подготовить качественное предложение.</p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Сохранение...' : isEditing ? 'Сохранить изменения' : 'Откликнуться'}
          </button>
        </div>
      </div>
    </div>
  );
}
