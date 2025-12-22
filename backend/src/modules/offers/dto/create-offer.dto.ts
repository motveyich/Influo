import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';

export enum OfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateOfferDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Influencer user ID',
  })
  @IsString()
  influencerId: string;

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
}
