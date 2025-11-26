import { Module } from '@nestjs/common';
import { InfluencerCardsController } from './influencer-cards.controller';
import { InfluencerCardsService } from './influencer-cards.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [InfluencerCardsController],
  providers: [InfluencerCardsService],
  exports: [InfluencerCardsService],
})
export class InfluencerCardsModule {}
