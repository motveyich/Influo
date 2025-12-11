import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsObject, IsEnum, IsDateString, Min } from 'class-validator';

export enum AdvertiserPlatform {
  VK = 'vk',
  YOUTUBE = 'youtube',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  OK = 'ok',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  TIKTOK = 'tiktok',
  TWITCH = 'twitch',
  RUTUBE = 'rutube',
  YANDEX_ZEN = 'yandex_zen',
  LIKEE = 'likee',
}

export class CreateAdvertiserCardDto {
  @ApiProperty({
    example: 'Tech Startup Inc.',
    description: 'Company name',
  })
  @IsString()
  companyName: string;

  @ApiProperty({
    example: 'Summer Product Launch',
    description: 'Campaign title',
  })
  @IsString()
  campaignTitle: string;

  @ApiProperty({
    example: 'Looking for tech influencers to promote our new app',
    description: 'Campaign description',
  })
  @IsString()
  campaignDescription: string;

  @ApiProperty({
    example: 'instagram',
    enum: AdvertiserPlatform,
    description: 'Target platform',
  })
  @IsEnum(AdvertiserPlatform)
  platform: AdvertiserPlatform;

  @ApiProperty({
    example: ['technology', 'lifestyle', 'education'],
    description: 'Product categories',
  })
  @IsArray()
  @IsString({ each: true })
  productCategories: string[];

  @ApiProperty({
    example: { amount: 5000, currency: 'USD' },
    description: 'Campaign budget',
  })
  @IsObject()
  budget: {
    amount: number;
    currency: string;
  };

  @ApiProperty({
    example: ['sponsored_post', 'story', 'video_review'],
    description: 'Service formats required',
  })
  @IsArray()
  @IsString({ each: true })
  serviceFormat: string[];

  @ApiProperty({
    example: { startDate: '2024-06-01', endDate: '2024-08-31' },
    description: 'Campaign duration',
  })
  @IsObject()
  campaignDuration: {
    startDate: string;
    endDate: string;
  };

  @ApiProperty({
    example: {
      minFollowers: 10000,
      maxFollowers: 100000,
      minEngagementRate: 3.0,
    },
    description: 'Influencer requirements',
  })
  @IsObject()
  influencerRequirements: {
    minFollowers: number;
    maxFollowers?: number;
    minEngagementRate?: number;
  };

  @ApiProperty({
    example: {
      interests: ['tech', 'gadgets', 'innovation'],
    },
    description: 'Target audience',
  })
  @IsObject()
  targetAudience: {
    interests: string[];
  };

  @ApiProperty({
    example: {
      email: 'contact@techstartup.com',
      phone: '+1234567890',
      preferredContactMethod: 'email',
    },
    description: 'Contact information',
  })
  @IsObject()
  contactInfo: {
    email: string;
    phone?: string;
    preferredContactMethod: string;
  };
}
