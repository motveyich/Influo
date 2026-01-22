import React, { useState } from 'react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { CollaborationOffer } from '../../../core/types';
import { X, Download, CheckCircle, XCircle, AlertCircle, Calendar, User } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface ViewCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: CollaborationOffer;
  screenshotUrl: string;
  onConfirm: () => Promise<void>;
  onReject: () => Promise<void>;
}

export function ViewCompletionModal({
  isOpen,
  onClose,
  offer,
  screenshotUrl,
  onConfirm,
  onReject
}: ViewCompletionModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useBodyScrollLock(isOpen);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      toast.success('Завершение подтверждено');
      onClose();
    } catch (error: any) {
      console.error('Failed to confirm completion:', error);
      toast.error(error.message || 'Не удалось подтвердить завершение');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Укажите причину отклонения завершения:');
    if (!reason) return;

    setIsProcessing(true);
    try {
      await onReject();
      toast.success('Завершение отклонено');
      onClose();
    } catch (error: any) {
      console.error('Failed to reject completion:', error);
      toast.error(error.message || 'Не удалось отклонить завершение');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = screenshotUrl;
    link.download = `completion-${offer.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const completionDate = offer.metadata?.completion_screenshot_uploaded_at
    ? formatDistanceToNow(parseISO(offer.metadata.completion_screenshot_uploaded_at), {
        addSuffix: true,
        locale: ru
      })
    : 'недавно';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              Просмотр выполнения сотрудничества
            </h2>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900 font-medium">
                    Информация о завершении
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <User className="w-4 h-4" />
                      <span>
                        Инициатор: {offer.completionInitiatedBy === offer.influencerId ? 'Инфлюенсер' : 'Рекламодатель'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <Calendar className="w-4 h-4" />
                      <span>Загружено: {completionDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Скриншот статистики выполнения
                </h3>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать</span>
                </button>
              </div>

              <div
                onClick={() => setShowFullImage(true)}
                className="relative rounded-lg overflow-hidden bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity border border-gray-200"
              >
                <img
                  src={screenshotUrl}
                  alt="Completion screenshot"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 transition-opacity">
                  <div className="bg-white rounded-lg px-4 py-2 text-sm font-medium text-gray-900">
                    Нажмите для полноэкранного просмотра
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                <strong>Внимание:</strong> Пожалуйста, внимательно проверьте скриншот статистики.
                После подтверждения сотрудничество будет завершено и станет доступным для оставления отзывов.
              </p>
            </div>
          </div>

          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Закрыть
            </button>
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Отклонить</span>
            </button>
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Обработка...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Подтвердить выполнение</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showFullImage && (
        <div
          onClick={() => setShowFullImage(false)}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 cursor-pointer"
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setShowFullImage(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={screenshotUrl}
              alt="Completion screenshot fullscreen"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
