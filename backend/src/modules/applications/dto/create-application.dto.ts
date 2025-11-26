import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional } from 'class-validator';

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
}
