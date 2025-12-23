import { supabase } from '../core/supabase';

export class AvatarService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  async uploadAvatar(userId: string, file: File): Promise<{ url: string | null; error: string | null }> {
    try {
      if (!file) {
        return { url: null, error: 'Файл не выбран' };
      }

      if (file.size > this.MAX_FILE_SIZE) {
        return { url: null, error: 'Размер файла не должен превышать 5 МБ' };
      }

      if (!this.ALLOWED_TYPES.includes(file.type)) {
        return { url: null, error: 'Допустимые форматы: JPEG, PNG, WebP, GIF' };
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (existingFiles && existingFiles.length > 0) {
        for (const existingFile of existingFiles) {
          await supabase.storage
            .from('avatars')
            .remove([`${userId}/${existingFile.name}`]);
        }
      }

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) return { url: null, error: error.message };

      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      await supabase
        .from('user_profiles')
        .update({ avatar: publicUrl })
        .eq('user_id', userId);

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      return {
        url: null,
        error: error instanceof Error ? error.message : 'Failed to upload avatar'
      };
    }
  }

  async deleteAvatar(userId: string): Promise<{ error: string | null }> {
    try {
      const { data: files } = await supabase.storage
        .from('avatars')
        .list(userId);

      if (files && files.length > 0) {
        const filesToDelete = files.map(file => `${userId}/${file.name}`);
        await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
      }

      await supabase
        .from('user_profiles')
        .update({ avatar: null })
        .eq('user_id', userId);

      return { error: null };
    } catch (error) {
      console.error('Failed to delete avatar:', error);
      return {
        error: error instanceof Error ? error.message : 'Failed to delete avatar'
      };
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
