export class UpdateSettingsDto {
  security?: {
    twoFactorEnabled?: boolean;
    passwordLastChanged?: string;
    activeSessions?: any[];
  };

  privacy?: {
    hideEmail?: boolean;
    hidePhone?: boolean;
    hideSocialMedia?: boolean;
    profileVisibility?: 'public' | 'private' | 'connections';
  };

  notifications?: {
    email?: {
      applications?: boolean;
      messages?: boolean;
      payments?: boolean;
      reviews?: boolean;
      marketing?: boolean;
    };
    push?: {
      enabled?: boolean;
      applications?: boolean;
      messages?: boolean;
      payments?: boolean;
      reviews?: boolean;
    };
    frequency?: 'immediate' | 'daily' | 'weekly';
    soundEnabled?: boolean;
  };

  interface?: {
    theme?: 'light' | 'dark' | 'system';
    language?: 'ru' | 'en';
    fontSize?: 'small' | 'medium' | 'large';
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
    timezone?: string;
  };

  account?: {
    isActive?: boolean;
    isDeactivated?: boolean;
    deactivatedAt?: string;
    deactivationReason?: string;
  };
}
