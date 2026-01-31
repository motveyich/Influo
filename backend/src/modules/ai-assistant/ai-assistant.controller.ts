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
    if (!user || !user.userId) {
      this.logger.error('User not authenticated or missing user ID', JSON.stringify(user));
      throw new HttpException('Пользователь не авторизован', HttpStatus.UNAUTHORIZED);
    }

    dto.userId = user.userId;

    try {
      this.logger.log(`Processing DeepSeek request - User: ${user.userId}, Type: ${dto.type}`);

      const result = await this.aiAssistantService.processDeepSeekRequest(dto);

      if (!result.response || result.response.trim().length === 0) {
        this.logger.warn(`Service returned empty response - Response: ${JSON.stringify(result)}`);
        throw new HttpException('AI вернул пустой ответ', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log(`DeepSeek request completed successfully - Cached: ${result.cached}, Response length: ${result.response.length}`);
      this.logger.debug(`Response preview: ${result.response.substring(0, 100)}...`);

      const responseData = {
        success: true,
        response: result.response,
        cached: result.cached,
        message: result.cached ? 'Ответ из кэша' : 'Новый запрос к DeepSeek'
      };

      this.logger.debug(`Sending response to client: ${JSON.stringify({ ...responseData, response: responseData.response.substring(0, 50) + '...' })}`);

      return responseData;
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

  @Post('clear-cache')
  clearCache(@CurrentUser() user: any) {
    this.logger.log(`Clearing AI assistant cache - User: ${user.userId}`);
    this.aiAssistantService.clearCache();
    return {
      success: true,
      message: 'Кэш AI assistant успешно очищен'
    };
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

      this.logger.log(`Testing DeepSeek connection for user ${user.userId}`);

      const testResult = await this.aiAssistantService.processDeepSeekRequest({
        type: AIRequestType.SUGGEST_REPLY,
        messages: [{ content: 'Привет', senderId: user.userId, timestamp: new Date().toISOString() }],
        conversationId: 'test',
        userId: user.userId
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
