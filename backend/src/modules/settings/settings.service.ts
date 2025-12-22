import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';

export interface UserSettings {
  id: string;
  userId: string;
  security: any;
  privacy: any;
  notifications: any;
  interface: any;
  account: any;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SettingsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getUserSettings(userId: string): Promise<UserSettings> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return await this.createDefaultSettings(userId);
      }

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to get user settings:', error);
      throw error;
    }
  }

  async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      const currentSettings = await this.getUserSettings(userId);

      const updatedSettings = {
        ...currentSettings,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('user_settings')
        .upsert([this.transformToDatabase(updatedSettings)], {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) throw error;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  }

  async changePassword(
    userId: string,
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (updateError) throw updateError;

      await this.updateSettings(userId, {
        security: {
          passwordLastChanged: new Date().toISOString()
        }
      } as any);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw new BadRequestException('Failed to change password');
    }
  }

  async enableTwoFactor(userId: string): Promise<{ qrCode: string; secret: string }> {
    try {
      const secret = this.generateTOTPSecret();
      const qrCode = `otpauth://totp/Influo:${userId}?secret=${secret}&issuer=Influo`;

      const currentSettings = await this.getUserSettings(userId);
      await this.updateSettings(userId, {
        security: {
          ...currentSettings.security,
          twoFactorEnabled: true
        }
      } as any);

      return { qrCode, secret };
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
      throw error;
    }
  }

  async disableTwoFactor(userId: string, verificationCode: string): Promise<void> {
    try {
      if (!verificationCode || verificationCode.length !== 6) {
        throw new BadRequestException('Invalid verification code');
      }

      const currentSettings = await this.getUserSettings(userId);
      await this.updateSettings(userId, {
        security: {
          ...currentSettings.security,
          twoFactorEnabled: false
        }
      } as any);
    } catch (error) {
      console.error('Failed to disable 2FA:', error);
      throw error;
    }
  }

  async signOutAllDevices(userId: string): Promise<void> {
    try {
      const supabase = this.supabaseService.getAdminClient();

      await supabase.auth.admin.signOut(userId, 'global');

      const currentSettings = await this.getUserSettings(userId);
      await this.updateSettings(userId, {
        security: {
          ...currentSettings.security,
          activeSessions: []
        }
      } as any);
    } catch (error) {
      console.error('Failed to sign out all devices:', error);
      throw error;
    }
  }

  async deactivateAccount(userId: string, reason?: string): Promise<void> {
    try {
      await this.updateSettings(userId, {
        account: {
          isActive: false,
          isDeactivated: true,
          deactivatedAt: new Date().toISOString(),
          deactivationReason: reason
        }
      } as any);
    } catch (error) {
      console.error('Failed to deactivate account:', error);
      throw error;
    }
  }

  async deleteAccount(userId: string, confirmationText: string): Promise<void> {
    try {
      if (confirmationText !== 'DELETE') {
        throw new BadRequestException('Confirmation text must be "DELETE"');
      }

      const supabase = this.supabaseService.getAdminClient();
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: userId
        })
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete account:', error);
      throw error;
    }
  }

  private async createDefaultSettings(userId: string): Promise<UserSettings> {
    try {
      const supabase = this.supabaseService.getAdminClient();
      const defaultSettings = this.getDefaultSettings(userId);

      const { data, error } = await supabase
        .from('user_settings')
        .insert([this.transformToDatabase(defaultSettings)])
        .select()
        .single();

      if (error) throw error;

      return this.transformFromDatabase(data);
    } catch (error) {
      console.error('Failed to create default settings:', error);
      return this.getDefaultSettings(userId);
    }
  }

  private getDefaultSettings(userId: string): UserSettings {
    return {
      id: userId,
      userId,
      security: {
        twoFactorEnabled: false,
        passwordLastChanged: new Date().toISOString(),
        activeSessions: []
      },
      privacy: {
        hideEmail: false,
        hidePhone: false,
        hideSocialMedia: false,
        profileVisibility: 'public'
      },
      notifications: {
        email: {
          applications: true,
          messages: true,
          payments: true,
          reviews: true,
          marketing: false
        },
        push: {
          enabled: true,
          applications: true,
          messages: true,
          payments: true,
          reviews: true
        },
        frequency: 'immediate',
        soundEnabled: true
      },
      interface: {
        theme: 'light',
        language: 'ru',
        fontSize: 'medium',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        timezone: 'Europe/Moscow'
      },
      account: {
        isActive: true,
        isDeactivated: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private generateTOTPSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  private transformFromDatabase(dbData: any): UserSettings {
    return {
      id: dbData.id,
      userId: dbData.user_id,
      security: dbData.security || {},
      privacy: dbData.privacy || {},
      notifications: dbData.notifications || {},
      interface: dbData.interface || {},
      account: dbData.account || {},
      createdAt: dbData.created_at,
      updatedAt: dbData.updated_at
    };
  }

  private transformToDatabase(settings: UserSettings): any {
    return {
      id: settings.id,
      user_id: settings.userId,
      security: settings.security,
      privacy: settings.privacy,
      notifications: settings.notifications,
      interface: settings.interface,
      account: settings.account,
      created_at: settings.createdAt,
      updated_at: settings.updatedAt
    };
  }
}
