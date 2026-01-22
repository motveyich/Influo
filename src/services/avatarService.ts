export class AvatarService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      if (!file) {
        throw new Error('Файл не выбран');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('Размер файла не должен превышать 5 МБ');
      }

      if (!this.ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Допустимые форматы: JPEG, PNG, WebP, GIF');
      }

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Не авторизован');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/profiles/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Не удалось загрузить аватар');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Не авторизован');
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/profiles/${userId}/avatar`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Не удалось удалить аватар');
      }
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
