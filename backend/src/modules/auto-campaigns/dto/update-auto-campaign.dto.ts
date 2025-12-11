import { PartialType } from '@nestjs/swagger';
import { CreateAutoCampaignDto } from './create-auto-campaign.dto';

export class UpdateAutoCampaignDto extends PartialType(CreateAutoCampaignDto) {}
