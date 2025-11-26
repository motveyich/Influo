import { PartialType } from '@nestjs/swagger';
import { CreateAdvertiserCardDto } from './create-advertiser-card.dto';

export class UpdateAdvertiserCardDto extends PartialType(CreateAdvertiserCardDto) {}
