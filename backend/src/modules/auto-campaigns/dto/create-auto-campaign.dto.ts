import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsObject, IsEnum, Min, Max, IsBoolean, IsOptional } from 'class-validator';

export enum CampaignPlatform {
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
}

export class CreateAutoCampaignDto {
  @ApiProperty({
    example: 'Summer Product Launch 2024',
    description: 'Campaign title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Promoting our new summer collection',
    description: 'Campaign description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 'instagram',
    enum: CampaignPlatform,
    description: 'Target platform',
  })
  @IsEnum(CampaignPlatform)
  platform: CampaignPlatform;

  @ApiProperty({
    example: 10,
    description: 'Maximum number of influencers',
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxInfluencers: number;

  @ApiProperty({
    example: { amount: 10000, currency: 'USD' },
    description: 'Total budget',
  })
  @IsObject()
  budget: {
    amount: number;
    currency: string;
  };

  @ApiProperty({
    example: { min: 10000, max: 100000 },
    description: 'Follower range',
  })
  @IsObject()
  followerRange: {
    min: number;
    max: number;
  };

  @ApiProperty({
    example: 3.5,
    description: 'Minimum engagement rate',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  minEngagementRate: number;

  @ApiProperty({
    example: ['fashion', 'lifestyle', 'beauty'],
    description: 'Target interests',
  })
  @IsArray()
  @IsString({ each: true })
  targetInterests: string[];

  @ApiProperty({
    example: { '18-24': 30, '25-34': 40, '35-44': 30 },
    description: 'Target age groups',
    required: false,
  })
  @IsOptional()
  @IsObject()
  targetAgeGroups?: Record<string, number>;

  @ApiProperty({
    example: ['US', 'UK', 'CA'],
    description: 'Target countries',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCountries?: string[];

  @ApiProperty({
    example: true,
    description: 'Enable chat with influencers',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enableChat?: boolean;
}
