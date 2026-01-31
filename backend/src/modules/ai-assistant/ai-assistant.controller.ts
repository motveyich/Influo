import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AIAssistantService } from './ai-assistant.service';
import { DeepSeekRequestDto } from './dto';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AIAssistantController {
  constructor(private readonly aiAssistantService: AIAssistantService) {}

  @Post('deepseek')
  async processDeepSeekRequest(
    @CurrentUser() user: any,
    @Body() dto: DeepSeekRequestDto
  ) {
    dto.userId = user.id;

    const result = await this.aiAssistantService.processDeepSeekRequest(dto);

    return {
      success: true,
      response: result.response,
      cached: result.cached,
      message: result.cached ? 'Ответ из кэша' : 'Новый запрос к DeepSeek'
    };
  }

  @Get('cache-stats')
  getCacheStats() {
    return this.aiAssistantService.getCacheStats();
  }
}
