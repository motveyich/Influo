import { apiClient, API_URL } from '../core/api';

export class CompletionScreenshotService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/jpe', 'image/jfif'];
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.jpe', '.jfif'];

  async uploadScreenshot(
    collaborationId: string,
    file: File,
    type: 'offer' | 'application' = 'application'
  ): Promise<string> {
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

      const endpoint = type === 'offer'
        ? `${API_URL}/offers/${collaborationId}/completion-screenshot`
        : `${API_URL}/applications/${collaborationId}/completion-screenshot`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Ошибка загрузки: ${response.status}`;

        console.error('Screenshot upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          file: {
            name: file.name,
            type: file.type,
            size: file.size
          }
        });

        // Provide more specific error messages
        if (response.status === 400) {
          throw new Error('Неверный формат файла. Используйте JPEG, PNG или WebP');
        } else if (response.status === 413) {
          throw new Error('Файл слишком большой. Максимальный размер: 10 МБ');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.url) {
        console.error('No URL in response:', data);
        throw new Error('Сервер не вернул URL скриншота');
      }

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

    // Check MIME type first
    const isValidMimeType = this.ALLOWED_TYPES.includes(file.type);

    // If MIME type is not recognized, check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = this.ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));

    if (!isValidMimeType && !hasValidExtension) {
      console.warn('File validation failed:', {
        fileName: file.name,
        fileType: file.type,
        allowedTypes: this.ALLOWED_TYPES,
        allowedExtensions: this.ALLOWED_EXTENSIONS
      });
      return { valid: false, error: 'Допустимые форматы: JPEG, JPG, PNG, WebP' };
    }

    return { valid: true };
  }
}

export const completionScreenshotService = new CompletionScreenshotService();
