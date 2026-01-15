import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsObject, IsEnum, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { Platform } from '../../../common/constants';

export class CreateInfluencerCardDto {
  @ApiProperty({
    example: 'instagram',
    enum: Platform,
    description: 'Social media platform',
  })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty({
    example: { followers: 50000, averageViews: 10000, engagementRate: 5.5 },
    description: 'Reach metrics',
  })
  @IsObject()
  reach: {
    followers: number;
    averageViews: number;
    engagementRate: number;
  };

  @ApiProperty({
    example: {
      ageGroups: { '18-24': 40, '25-34': 35, '35-44': 25 },
      genderSplit: { male: 45, female: 55 },
      topCountries: ['US', 'UK', 'CA'],
      interests: ['fashion', 'lifestyle', 'travel'],
    },
    description: 'Audience demographics',
  })
  @IsObject()
  audienceDemographics: {
    ageGroups: Record<string, number>;
    genderSplit: Record<string, number>;
    topCountries: string[];
    interests: string[];
  };

  @ApiProperty({
    example: {
      contentTypes: ['post', 'story', 'reel'],
      pricing: { post: 500, story: 200, reel: 800 },
      currency: 'USD',
      blacklistedProductCategories: ['alcohol', 'tobacco'],
    },
    description: 'Service details',
  })
  @IsObject()
  serviceDetails: {
    contentTypes: string[];
    pricing: Record<string, number>;
    currency: string;
    blacklistedProductCategories: string[];
  };

  @ApiProperty({
    example: true,
    description: 'Is card active',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
