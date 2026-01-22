import { apiClient, API_URL } from '../core/api';

export class CompletionScreenshotService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  async uploadScreenshot(offerId: string, file: File): Promise<string> {
    try {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Не авторизован');
      }

      const response = await fetch(`${API_URL}/offers/${offerId}/completion-screenshot`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Не удалось загрузить скриншот');
      }

      const data = await response.json();
      return data.url;
    } catch (error: any) {
      console.error('Failed to upload completion screenshot:', error);
      throw error;
    }
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'Файл не выбран' };
    }

    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'Размер файла не должен превышать 10 МБ' };
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Допустимые форматы: JPEG, PNG, WebP' };
    }

    return { valid: true };
  }
}

export const completionScreenshotService = new CompletionScreenshotService();
