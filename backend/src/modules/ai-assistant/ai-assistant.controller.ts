import { Controller, Post, Body, UseGuards, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AIAssistantService } from './ai-assistant.service';
import { DeepSeekRequestDto, AIRequestType } from './dto';

@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
export class AIAssistantController {
  private readonly logger = new Logger(AIAssistantController.name);

  constructor(private readonly aiAssistantService: AIAssistantService) {}

  @Post('deepseek')
  async processDeepSeekRequest(
    @CurrentUser() user: any,
    @Body() dto: DeepSeekRequestDto
  ) {
    dto.userId = user.id;

    try {
      this.logger.log(`Processing DeepSeek request - User: ${user.id}, Type: ${dto.type}`);

      const result = await this.aiAssistantService.processDeepSeekRequest(dto);

      if (!result.response || result.response.trim().length === 0) {
        this.logger.warn('Service returned empty response');
        throw new HttpException('AI вернул пустой ответ', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log(`DeepSeek request completed successfully - Cached: ${result.cached}`);

      return {
        success: true,
        response: result.response,
        cached: result.cached,
        message: result.cached ? 'Ответ из кэша' : 'Новый запрос к DeepSeek'
      };
    } catch (error) {
      this.logger.error(`DeepSeek request failed: ${error.message}`, error.stack);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          success: false,
          message: error.message || 'Не удалось получить ответ от AI',
          error: 'AI_ASSISTANT_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cache-stats')
  getCacheStats() {
    return this.aiAssistantService.getCacheStats();
  }

  @Get('test-connection')
  async testConnection(@CurrentUser() user: any) {
    try {
      const apiKey = process.env.DEEPSEEK_API_KEY;

      if (!apiKey) {
        return {
          success: false,
          message: 'DeepSeek API key не настроен',
          configured: false
        };
      }

      this.logger.log(`Testing DeepSeek connection for user ${user.id}`);

      const testResult = await this.aiAssistantService.processDeepSeekRequest({
        type: AIRequestType.SUMMARY,
        messages: [{ content: 'Привет', senderId: user.id, timestamp: new Date().toISOString() }],
        conversationId: 'test',
        userId: user.id
      });

      return {
        success: true,
        message: 'DeepSeek API работает корректно',
        configured: true,
        testResponse: testResult.response.substring(0, 100) + '...'
      };
    } catch (error) {
      this.logger.error(`DeepSeek connection test failed: ${error.message}`);
      return {
        success: false,
        message: error.message,
        configured: true,
        error: 'CONNECTION_TEST_FAILED'
      };
    }
  }
}
