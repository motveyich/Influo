import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsNumber, IsArray } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Card ID (influencer or advertiser)',
  })
  @IsUUID()
  cardId: string;

  @ApiProperty({
    example: 'influencer',
    description: 'Card type',
  })
  @IsString()
  cardType: 'influencer' | 'advertiser';

  @ApiProperty({
    example: 'I am interested in collaborating on this campaign',
    description: 'Application message',
    required: false,
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiProperty({
    example: 50000,
    description: 'Proposed rate for the collaboration',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  proposedRate?: number;

  @ApiProperty({
    example: '2-4 weeks',
    description: 'Timeline for the collaboration',
    required: false,
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiProperty({
    example: ['Instagram post', 'Story mention', 'Blog review'],
    description: 'List of deliverables',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiProperty({
    example: 'Additional information about the collaboration',
    description: 'Any additional information',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInfo?: string;
}
