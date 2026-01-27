import { IsString, IsEnum, IsOptional } from 'class-validator';

export class TrackViewDto {
  @IsString()
  cardId: string;

  @IsEnum(['influencer_cards', 'advertiser_cards'])
  cardType: 'influencer_cards' | 'advertiser_cards';

  @IsString()
  @IsOptional()
  viewerId?: string;
}
