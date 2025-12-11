import { PartialType } from '@nestjs/swagger';
import { CreateInfluencerCardDto } from './create-influencer-card.dto';

export class UpdateInfluencerCardDto extends PartialType(CreateInfluencerCardDto) {}
