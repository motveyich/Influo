import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, InitializeConversationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations/initialize')
  @ApiOperation({ summary: 'Initialize a new conversation' })
  async initializeConversation(
    @CurrentUser('userId') userId: string,
    @Body() dto: InitializeConversationDto,
  ) {
    return this.chatService.initializeConversation(userId, dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  async getConversations(@CurrentUser('userId') userId: string) {
    return this.chatService.getConversations(userId);
  }

  @Get('messages/:conversationId')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  async getMessages(
    @CurrentUser('userId') userId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatService.getMessages(userId, conversationId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, dto);
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark message as read' })
  async markAsRead(
    @CurrentUser('userId') userId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.chatService.markAsRead(userId, messageId);
  }

  @Get('conversations/:otherUserId/initiator')
  @ApiOperation({ summary: 'Get conversation initiator' })
  async getConversationInitiator(
    @CurrentUser('userId') userId: string,
    @Param('otherUserId') otherUserId: string,
  ) {
    return this.chatService.getConversationInitiator(userId, otherUserId);
  }
}
