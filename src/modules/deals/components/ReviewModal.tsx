import React, { useState } from 'react';
import { Review, dealService } from '../../../services/dealService';
import { X, Star, Send, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  reviewerId: string;
  revieweeId: string;
  collaborationType: 'as_influencer' | 'as_advertiser';
  revieweeName: string;
  onReviewSubmitted?: (review: Review) => void;
}

export function ReviewModal({
  isOpen,
  onClose,
  dealId,
  reviewerId,
  revieweeId,
  collaborationType,
  revieweeName,
  onReviewSubmitted
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleStarClick = (starRating: number) => {
    setRating(starRating);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Заголовок отзыва обязателен';
    } else if (title.length < 5) {
      newErrors.title = 'Заголовок должен содержать минимум 5 символов';
    }

    if (!comment.trim()) {
      newErrors.comment = 'Комментарий обязателен';
    } else if (comment.length < 20) {
      newErrors.comment = 'Комментарий должен содержать минимум 20 символов';
    }

    if (rating < 1 || rating > 5) {
      newErrors.rating = 'Выберите оценку от 1 до 5 звезд';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Пожалуйста, исправьте ошибки перед отправкой');
      return;
    }

    setIsLoading(true);
    try {
      const review = await dealService.createReview({
        dealId,
        reviewerId,
        revieweeId,
        rating,
        title,
        comment,
        collaborationType,
        isPublic,
        metadata: {
          submitted_at: new Date().toISOString()
        }
      });

      toast.success('Отзыв успешно отправлен!');
      onReviewSubmitted?.(review);
      onClose();
    } catch (error: any) {
      console.error('Failed to submit review:', error);
      toast.error(error.message || 'Не удалось отправить отзыв');
    } finally {
      setIsLoading(false);
    }
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 5:
        return 'Превосходно';
      case 4:
        return 'Хорошо';
      case 3:
        return 'Удовлетворительно';
      case 2:
        return 'Плохо';
      case 1:
        return 'Очень плохо';
      default:
        return 'Оценка';
    }
  };

  const getCollaborationTypeLabel = () => {
    return collaborationType === 'as_influencer' 
      ? 'как инфлюенсер' 
      : 'как рекламодатель';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Оставить отзыв</h2>
            <p className="text-sm text-gray-600">
              О сотрудничестве с {revieweeName} {getCollaborationTypeLabel()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Оценка *
            </label>
            <div className="flex items-center space-x-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleStarClick(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    } hover:text-yellow-400 transition-colors`}
                  />
                </button>
              ))}
              <span className="ml-3 text-lg font-medium text-gray-900">
                {getRatingText(rating)}
              </span>
            </div>
            {errors.rating && (
              <p className="text-sm text-red-600 flex items-center">
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Краткий заголовок вашего опыта"
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
              Ваш отзыв *
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                errors.comment ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Поделитесь опытом сотрудничества: качество работы, соблюдение сроков, коммуникация..."
            />
            <div className="flex justify-between items-center mt-1">
              {errors.comment && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.comment}
                </p>
              )}
              <p className="text-sm text-gray-500 ml-auto">
                {comment.length}/1000 символов
              </p>
            </div>
          </div>

          {/* Public/Private */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="isPublic" className="text-sm text-gray-700">
              Сделать отзыв публичным (другие пользователи смогут его видеть)
            </label>
          </div>

          {/* Review Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Предварительный просмотр</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-900">{rating}/5</span>
              </div>
              <h5 className="font-medium text-gray-900">{title || 'Заголовок отзыва'}</h5>
              <p className="text-sm text-gray-600">{comment || 'Текст отзыва...'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isLoading ? 'Отправка...' : 'Отправить отзыв'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}