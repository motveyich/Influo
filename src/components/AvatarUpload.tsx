import React, { useState, useRef } from 'react';
import { Upload, Trash2, User } from 'lucide-react';
import { avatarService } from '../services/avatarService';
import toast from 'react-hot-toast';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  fullName?: string;
  onAvatarUpdate: (newAvatarUrl: string | null) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, fullName, onAvatarUpdate }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const avatarUrl = await avatarService.uploadAvatar(userId, file);
      setPreviewUrl(avatarUrl);
      onAvatarUpdate(avatarUrl);
      toast.success('Аватар успешно загружен');
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      toast.error(error.message || 'Не удалось загрузить аватар');
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentAvatarUrl) return;

    setIsUploading(true);
    try {
      await avatarService.deleteAvatar(userId);
      setPreviewUrl(null);
      onAvatarUpdate(null);
      toast.success('Аватар удалён');
    } catch (error: any) {
      console.error('Failed to delete avatar:', error);
      toast.error(error.message || 'Не удалось удалить аватар');
    } finally {
      setIsUploading(false);
    }
  };

  const getDisplayUrl = () => {
    if (previewUrl) return previewUrl;
    if (fullName) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=3b82f6&color=fff&size=200`;
    }
    return avatarService.getDefaultAvatarUrl();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
          {previewUrl || currentAvatarUrl ? (
            <img
              src={getDisplayUrl()}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-4xl font-semibold">
              {fullName ? avatarService.getUserInitials(fullName) : <User className="w-16 h-16" />}
            </div>
          )}
        </div>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="w-4 h-4" />
          <span>{currentAvatarUrl ? 'Изменить' : 'Загрузить'}</span>
        </button>

        {currentAvatarUrl && (
          <button
            onClick={handleDeleteAvatar}
            disabled={isUploading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span>Удалить</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500 text-center max-w-xs">
        Допустимые форматы: JPEG, PNG, WebP, GIF. Максимальный размер: 5 МБ
      </p>
    </div>
  );
}
