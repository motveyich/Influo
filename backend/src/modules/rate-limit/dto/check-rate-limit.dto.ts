import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckRateLimitDto {
  @ApiProperty()
  @IsString()
  targetUserId: string;

  @ApiProperty({ required: false, enum: ['application', 'favorite', 'automatic_offer', 'manual_offer'] })
  @IsOptional()
  @IsEnum(['application', 'favorite', 'automatic_offer', 'manual_offer'])
  interactionType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardId?: string;
}
