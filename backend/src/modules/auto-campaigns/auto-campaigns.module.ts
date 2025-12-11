import { Module } from '@nestjs/common';
import { AutoCampaignsController } from './auto-campaigns.controller';
import { AutoCampaignsService } from './auto-campaigns.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AutoCampaignsController],
  providers: [AutoCampaignsService],
  exports: [AutoCampaignsService],
})
export class AutoCampaignsModule {}
