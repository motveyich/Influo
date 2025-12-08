import { IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFavoriteDto {
  @ApiProperty({ description: 'Card type', enum: ['influencer', 'advertiser'] })
  @IsIn(['influencer', 'advertiser'])
  cardType: string;

  @ApiProperty({ description: 'Card ID' })
  @IsUUID()
  cardId: string;
}
