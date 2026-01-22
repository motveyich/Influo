import React, { useState, useRef } from 'react';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
import { completionScreenshotService } from '../../../services/completionScreenshotService';
import { X, Upload, AlertCircle, Image as ImageIcon, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CompleteCollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborationId: string;
  collaborationType: 'offer' | 'application';
  onComplete: (screenshotUrl: string) => Promise<void>;
}

export function CompleteCollaborationModal({
  isOpen,
  onClose,
  collaborationId,
  collaborationType,
  onComplete
}: CompleteCollaborationModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useBodyScrollLock(isOpen);

  const handleFileSelect = (file: File) => {
    const validation = completionScreenshotService.validateFile(file);

    if (!validation.valid) {
      toast.error(validation.error || 'Недопустимый файл');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Пожалуйста, загрузите скриншот');
      return;
    }

    setIsUploading(true);

    try {
      const screenshotUrl = await completionScreenshotService.uploadScreenshot(
        collaborationId,
        selectedFile,
        collaborationType
      );

      await onComplete(screenshotUrl);

      toast.success('Сотрудничество успешно завершено');
      handleClose();
    } catch (error: any) {
      console.error('Failed to complete collaboration:', error);
      toast.error(error.message || 'Не удалось завершить сотрудничество');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Завершить сотрудничество
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-900 font-medium">
                Требуется подтверждение выполнения
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Загрузите скриншот или фото статистики выполненной рекламной кампании.
                Это необходимо для подтверждения результатов и завершения сотрудничества.
              </p>
            </div>
          </div>

          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Перетащите файл сюда или нажмите для выбора
              </p>
              <p className="text-xs text-gray-500">
                Допустимые форматы: JPEG, PNG, WebP (макс. 10 МБ)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">
                    Файл загружен
                  </span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Удалить
                </button>
              </div>

              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              )}

              <div className="mt-3 flex items-center space-x-2 text-sm text-gray-600">
                <ImageIcon className="w-4 h-4" />
                <span>{selectedFile.name}</span>
                <span className="text-gray-400">
                  ({(selectedFile.size / 1024 / 1024).toFixed(2)} МБ)
                </span>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-900">
              <strong>Внимание:</strong> После отправки запроса на завершение,
              рекламодатель сможет просмотреть скриншот и подтвердить или отклонить завершение сотрудничества.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || isUploading}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Загрузка...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Завершить сотрудничество</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
