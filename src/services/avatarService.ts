import { supabase } from '../core/supabase';

export class AvatarService {
  private readonly BUCKET_NAME = 'avatars';
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

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { data: existingFiles } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        for (const existingFile of existingFiles) {
          await supabase.storage
            .from(this.BUCKET_NAME)
            .remove([`${userId}/${existingFile.name}`]);
        }
      }

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      const avatarUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar: avatarUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      return avatarUrl;
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      throw error;
    }
  }

  async deleteAvatar(userId: string): Promise<void> {
    try {
      const { data: files } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(userId);

      if (files && files.length > 0) {
        const filesToRemove = files.map(file => `${userId}/${file.name}`);
        const { error } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filesToRemove);

        if (error) throw error;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar: null })
        .eq('user_id', userId);

      if (updateError) throw updateError;
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
