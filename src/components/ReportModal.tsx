import React, { useState } from 'react';
import { X, AlertTriangle, Send, Flag } from 'lucide-react';
import { ReportType } from '../core/types';
import { reportService } from '../services/reportService';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'user_profile' | 'influencer_card' | 'campaign' | 'chat_message' | 'offer';
  targetId: string;
  targetTitle?: string;
}

const REPORT_TYPES: Array<{ value: ReportType; label: string; description: string }> = [
  { value: 'spam', label: 'Скам', description: 'Мошенничество или обман' },
  { value: 'fake', label: 'Введение в заблуждение, неверная информация', description: 'Ложные данные или искажение фактов' },
  { value: 'harassment', label: 'Домогательства', description: 'Угрозы, оскорбления или преследование' },
  { value: 'other', label: 'Другое', description: 'Другие нарушения правил' }
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetTitle }: ReportModalProps) {
  const [selectedType, setSelectedType] = useState<ReportType>('spam');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { user } = useAuth();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!description.trim()) {
      newErrors.description = 'Описание жалобы обязательно';
    } else if (description.length < 10) {
      newErrors.description = 'Описание должно содержать минимум 10 символов';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    setIsLoading(true);
    try {
      await reportService.createReport(
        user.id,
        targetType,
        targetId,
        selectedType,
        description
      );

      toast.success('Жалоба отправлена. Мы рассмотрим её в ближайшее время.');
      onClose();
      
      // Reset form
      setSelectedType('spam');
      setDescription('');
      setErrors({});
    } catch (error: any) {
      console.error('Failed to submit report:', error);
      toast.error(error.message || 'Не удалось отправить жалобу');
    } finally {
      setIsLoading(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'user_profile':
        return 'профиль пользователя';
      case 'influencer_card':
        return 'карточку инфлюенсера';
      case 'campaign':
        return 'кампанию';
      case 'chat_message':
        return 'сообщение';
      case 'offer':
        return 'предложение';
      default:
        return 'контент';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Flag className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-semibold text-gray-900">Пожаловаться</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Target Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              Вы жалуетесь на {getTargetTypeLabel()}
              {targetTitle && (
                <span className="font-medium text-gray-900">: {targetTitle}</span>
              )}
            </p>
          </div>

          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Тип нарушения *
            </label>
            <div className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <label key={type.value} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value={type.value}
                    checked={selectedType === type.value}
                    onChange={(e) => setSelectedType(e.target.value as ReportType)}
                    className="mt-1 text-red-600 border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{type.label}</p>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подробное описание *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Опишите подробно, что именно нарушает правила платформы..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.description && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {description.length}/1000 символов
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Важно</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ложные жалобы могут привести к ограничениям вашего аккаунта. 
                  Убедитесь, что жалоба обоснована.
                </p>
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
            onClick={handleSubmit}
            disabled={isLoading || !description.trim()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить жалобу'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}