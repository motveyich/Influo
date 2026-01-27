import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsDateString } from 'class-validator';

export class CreatePlatformEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(['webinar', 'workshop', 'conference', 'meetup', 'other'])
  event_type: 'webinar' | 'workshop' | 'conference' | 'meetup' | 'other';

  @IsDateString()
  start_date: string;

  @IsDateString()
  @IsOptional()
  end_date?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  registration_link?: string;

  @IsBoolean()
  @IsOptional()
  is_published?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
