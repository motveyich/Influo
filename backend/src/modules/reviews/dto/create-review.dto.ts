import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, Min, Max, IsEnum, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Deal ID (Offer or Application ID)',
  })
  @IsUUID()
  dealId: string;

  @ApiProperty({
    example: 'application',
    description: 'Collaboration type',
    enum: ['application', 'offer'],
  })
  @IsEnum(['application', 'offer'])
  collaborationType: 'application' | 'offer';

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Reviewed user ID (influencer or advertiser)',
  })
  @IsUUID()
  revieweeId: string;

  @ApiProperty({
    example: 5,
    description: 'Rating (1-5)',
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'Great collaboration, very professional!',
    description: 'Review comment',
  })
  @IsString()
  comment: string;

  @ApiProperty({
    example: 'Excellent work!',
    description: 'Review title',
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;
}
