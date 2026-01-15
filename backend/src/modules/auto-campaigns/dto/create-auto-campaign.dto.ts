import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsEnum, Min, IsOptional, IsDateString } from 'class-validator';
import { Platform, ContentType } from '../../../common/constants';

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
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 10000,
    description: 'Minimum budget',
  })
  @IsNumber()
  @Min(0)
  budgetMin: number;

  @ApiProperty({
    example: 50000,
    description: 'Maximum budget',
  })
  @IsNumber()
  @Min(0)
  budgetMax: number;

  @ApiProperty({
    example: 10000,
    description: 'Minimum audience size',
  })
  @IsNumber()
  @Min(0)
  audienceMin: number;

  @ApiProperty({
    example: 100000,
    description: 'Maximum audience size',
  })
  @IsNumber()
  @Min(0)
  audienceMax: number;

  @ApiProperty({
    example: 10,
    description: 'Target number of influencers',
  })
  @IsNumber()
  @Min(1)
  targetInfluencersCount: number;

  @ApiProperty({
    example: ['post', 'story', 'reel'],
    description: 'Content types',
    enum: ContentType,
    isArray: true,
  })
  @IsArray()
  @IsEnum(ContentType, { each: true })
  contentTypes: ContentType[];

  @ApiProperty({
    example: ['instagram', 'tiktok'],
    description: 'Target platforms',
    enum: Platform,
    isArray: true,
  })
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];

  @ApiProperty({
    example: '2024-06-01T00:00:00Z',
    description: 'Campaign start date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: '2024-08-31T23:59:59Z',
    description: 'Campaign end date',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 0.05,
    description: 'Target price per follower',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetPricePerFollower?: number;
}
