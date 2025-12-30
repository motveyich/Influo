import { Module } from '@nestjs/common';
import { BlacklistController } from './blacklist.controller';
import { BlacklistService } from './blacklist.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [BlacklistController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
