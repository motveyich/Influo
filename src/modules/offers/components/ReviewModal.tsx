import React, { useState } from 'react';
import { CollaborationReview } from '../../../core/types';
import { reviewService } from '../services/reviewService';
import { X, Save, AlertCircle, Star } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  reviewerId: string;
  revieweeId: string;
  onReviewCreated: (review: CollaborationReview) => void;
}

export function ReviewModal({ 
  isOpen, 
  onClose, 
  offerId, 
  reviewerId, 
  revieweeId, 
  onReviewCreated 
}: ReviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    rating: 0,
    title: '',
    comment: '',
    isPublic: true
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.rating === 0) {
      newErrors.rating = 'Поставьте оценку от 1 до 5';
    }

    if (!formData.title.trim()) {
      newErrors.title = 'Заголовок отзыва обязателен';
    } else if (formData.title.length < 5) {
      newErrors.title = 'Заголовок должен содержать минимум 5 символов';
    }

    if (!formData.comment.trim()) {
      newErrors.comment = 'Комментарий обязателен';
    } else if (formData.comment.length < 10) {
      newErrors.comment = 'Комментарий должен содержать минимум 10 символов';
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
      const reviewData: Partial<CollaborationReview> = {
        offerId,
        reviewerId,
        revieweeId,
        ...formData
      };

      const createdReview = await reviewService.createReview(reviewData);
      toast.success('Отзыв отправлен успешно!');
      onReviewCreated(createdReview);
      onClose();
    } catch (error: any) {
      console.error('Failed to create review:', error);
      toast.error(error.message || 'Не удалось создать отзыв');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Оценить сотрудничество
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Оценка сотрудничества *
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleStarClick(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= formData.rating 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-3 text-sm text-gray-600">
                {formData.rating === 0 ? 'Выберите оценку' :
                 formData.rating === 1 ? 'Очень плохо' :
                 formData.rating === 2 ? 'Плохо' :
                 formData.rating === 3 ? 'Удовлетворительно' :
                 formData.rating === 4 ? 'Хорошо' : 'Отлично'}
              </span>
            </div>
            {errors.rating && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.rating}
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Заголовок отзыва *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Отличное сотрудничество"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Комментарий *
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.comment ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Опишите ваш опыт сотрудничества..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.comment && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.comment}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {formData.comment.length}/500 символов
              </p>
            </div>
          </div>

          {/* Public Review */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Публичный отзыв (будет виден всем пользователям)
              </span>
            </label>
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
            <span>{isLoading ? 'Сохранение...' : 'Отправить отзыв'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}