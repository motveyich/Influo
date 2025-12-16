import { apiClient } from '../core/api';

export class AvatarService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  async uploadAvatar(userId: string, file: File): Promise<string> {
    if (!file) {
      throw new Error('Файл не выбран');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error('Размер файла не должен превышать 5 МБ');
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Допустимые форматы: JPEG, PNG, WebP, GIF');
    }

    try {
      const result = await apiClient.uploadFile<{ avatar: string }>(
        `/profiles/${userId}/avatar`,
        file
      );
      return result.avatar;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      await apiClient.patch(`/profiles/${userId}`, { avatar: null });
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      throw error;
    }
  }

  getAvatarUrl(avatarUrl: string | null): string {
    if (!avatarUrl) {
      return this.getDefaultAvatarUrl();
    }
    return avatarUrl;
  }

  getDefaultAvatarUrl(): string {
    return `https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff&size=200`;
  }

  getUserInitials(fullName?: string): string {
    if (!fullName) return 'U';

    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName[0].toUpperCase();
  }
}

export const avatarService = new AvatarService();
