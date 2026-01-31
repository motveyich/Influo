import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsDateString } from 'class-validator';

export class CreatePlatformUpdateDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  summary?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsEnum(['info', 'warning', 'success', 'error'])
  type: 'info' | 'warning' | 'success' | 'error';

  @IsEnum(['low', 'medium', 'high', 'critical'])
  @IsOptional()
  priority?: 'low' | 'medium' | 'high' | 'critical';

  @IsString()
  @IsOptional()
  url?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsBoolean()
  @IsOptional()
  is_important?: boolean;

  @IsBoolean()
  @IsOptional()
  is_published?: boolean;

  @IsDateString()
  @IsOptional()
  published_at?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
