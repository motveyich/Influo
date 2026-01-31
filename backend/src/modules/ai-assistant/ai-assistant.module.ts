import { Module } from '@nestjs/common';
import { AIAssistantController } from './ai-assistant.controller';
import { AIAssistantService } from './ai-assistant.service';
import { SupabaseModule } from '../../shared/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AIAssistantController],
  providers: [AIAssistantService],
  exports: [AIAssistantService]
})
export class AIAssistantModule {}
