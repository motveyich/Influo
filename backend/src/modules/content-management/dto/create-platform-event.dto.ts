import { IsString, IsEnum, IsOptional, IsBoolean, IsObject, IsDateString, IsInt } from 'class-validator';

export class CreatePlatformEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(['webinar', 'workshop', 'conference', 'meetup', 'other', 'campaign_launch', 'achievement', 'contest', 'milestone', 'announcement', 'maintenance'])
  @IsOptional()
  type?: 'webinar' | 'workshop' | 'conference' | 'meetup' | 'other' | 'campaign_launch' | 'achievement' | 'contest' | 'milestone' | 'announcement' | 'maintenance';

  @IsInt()
  @IsOptional()
  participant_count?: number;

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
