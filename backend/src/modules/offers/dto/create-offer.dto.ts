import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min, IsArray } from 'class-validator';

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum OfferSourceType {
  DIRECT = 'direct',
  INFLUENCER_CARD = 'influencer_card',
  ADVERTISER_CARD = 'advertiser_card',
  CAMPAIGN = 'campaign',
}

export class CreateOfferDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Influencer user ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  influencerId?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Advertiser user ID (for card applications)',
    required: false,
  })
  @IsOptional()
  @IsString()
  advertiserId?: string;

  @ApiProperty({
    example: 'Sponsored Instagram post',
    description: 'Offer title',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'We would like you to create a sponsored post for our product',
    description: 'Offer description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: 500,
    description: 'Offer amount',
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    example: 'post',
    description: 'Content type',
  })
  @IsString()
  contentType: string;

  @ApiProperty({
    example: '2024-12-31',
    description: 'Delivery deadline',
    required: false,
  })
  @IsOptional()
  @IsString()
  deadline?: string;

  @ApiProperty({
    example: '2 weeks',
    description: 'Timeline for delivery',
    required: false,
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiProperty({
    example: ['1 post', '3 stories'],
    description: 'List of deliverables',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiProperty({
    enum: OfferSourceType,
    example: OfferSourceType.DIRECT,
    description: 'Source type of the offer',
    required: false,
  })
  @IsOptional()
  @IsEnum(OfferSourceType)
  sourceType?: OfferSourceType;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Source card ID (if from card application)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceCardId?: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Campaign ID (if from campaign)',
    required: false,
  })
  @IsOptional()
  @IsString()
  campaignId?: string;
}
