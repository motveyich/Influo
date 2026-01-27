import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreatePlatformUpdateDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(['info', 'warning', 'success', 'error'])
  type: 'info' | 'warning' | 'success' | 'error';

  @IsEnum(['low', 'medium', 'high', 'critical'])
  priority: 'low' | 'medium' | 'high' | 'critical';

  @IsBoolean()
  @IsOptional()
  is_published?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
