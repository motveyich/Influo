import { Module } from '@nestjs/common';
import { AdvertiserCardsController } from './advertiser-cards.controller';
import { AdvertiserCardsService } from './advertiser-cards.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AdvertiserCardsController],
  providers: [AdvertiserCardsService],
  exports: [AdvertiserCardsService],
})
export class AdvertiserCardsModule {}
