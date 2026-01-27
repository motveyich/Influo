import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordInteractionDto {
  @ApiProperty()
  @IsString()
  targetUserId: string;

  @ApiProperty({ enum: ['application', 'favorite', 'automatic_offer', 'manual_offer'] })
  @IsEnum(['application', 'favorite', 'automatic_offer', 'manual_offer'])
  interactionType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  campaignId?: string;
}
