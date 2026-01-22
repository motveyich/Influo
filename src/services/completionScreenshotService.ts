import { supabase } from '../core/supabase';

export class CompletionScreenshotService {
  private readonly BUCKET_NAME = 'completion-screenshots';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  async uploadScreenshot(offerId: string, file: File): Promise<string> {
    try {
      if (!file) {
        throw new Error('Файл не выбран');
      }

      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('Размер файла не должен превышать 10 МБ');
      }

      if (!this.ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Допустимые форматы: JPEG, PNG, WebP');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${offerId}/completion-screenshot.${fileExt}`;

      // Check if file already exists and remove it
      const { data: existingFiles } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(offerId);

      if (existingFiles && existingFiles.length > 0) {
        for (const existingFile of existingFiles) {
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([`${offerId}/${existingFile.name}`]);
        }
      }

      // Upload new file
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      // Get public URL (will still require authentication due to bucket policies)
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to upload completion screenshot:', error);
      throw error;
    }
  }

  async getScreenshotUrl(offerId: string): Promise<string | null> {
    try {
      const { data: files } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(offerId);

      if (!files || files.length === 0) {
        return null;
      }

      // Get the first file (should be only one)
      const file = files[0];
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(`${offerId}/${file.name}`);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Failed to get completion screenshot URL:', error);
      return null;
    }
  }

  async deleteScreenshot(offerId: string): Promise<void> {
    try {
      const { data: files } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(offerId);

      if (files && files.length > 0) {
        const filesToRemove = files.map(file => `${offerId}/${file.name}`);
        const { error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToRemove);

        if (error) throw error;
      }
    } catch (error) {
      console.error('Failed to delete completion screenshot:', error);
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
