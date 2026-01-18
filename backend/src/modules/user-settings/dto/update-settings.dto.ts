import { IsOptional, IsBoolean, IsString, IsEnum, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

class SecuritySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  passwordLastChanged?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  activeSessions?: any[];
}

class PrivacySettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hidePhone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideSocialMedia?: boolean;

  @ApiPropertyOptional({ enum: ['public', 'private', 'connections'] })
  @IsOptional()
  @IsEnum(['public', 'private', 'connections'])
  profileVisibility?: 'public' | 'private' | 'connections';
}

class InterfaceSettingsDto {
  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsEnum(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional({ enum: ['ru', 'en'] })
  @IsOptional()
  @IsEnum(['ru', 'en'])
  language?: 'ru' | 'en';

  @ApiPropertyOptional({ enum: ['small', 'medium', 'large'] })
  @IsOptional()
  @IsEnum(['small', 'medium', 'large'])
  fontSize?: 'small' | 'medium' | 'large';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ enum: ['12h', '24h'] })
  @IsOptional()
  @IsEnum(['12h', '24h'])
  timeFormat?: '12h' | '24h';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}

class AccountSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDeactivated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deactivatedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deactivationReason?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SecuritySettingsDto)
  security?: SecuritySettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacy?: PrivacySettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => InterfaceSettingsDto)
  interface?: InterfaceSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => AccountSettingsDto)
  account?: AccountSettingsDto;
}
