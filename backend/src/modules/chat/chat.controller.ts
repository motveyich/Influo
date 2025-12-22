import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { SendMessageDto, MarkReadDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @CurrentUser('userId') userId: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(userId, sendMessageDto);
  }

  @Get('conversations/:otherUserId')
  @ApiOperation({ summary: 'Get conversation with another user' })
  @ApiParam({ name: 'otherUserId', description: 'ID of the other user' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages to fetch' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getConversation(
    @CurrentUser('userId') userId: string,
    @Param('otherUserId') otherUserId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.chatService.getConversation(userId, otherUserId, limit, offset);
  }

  @Get('chats')
  @ApiOperation({ summary: 'Get list of all chats for current user' })
  @ApiResponse({ status: 200, description: 'Chat list retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChatList(@CurrentUser('userId') userId: string) {
    return this.chatService.getChatList(userId);
  }

  @Patch('messages/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markMessagesAsRead(
    @CurrentUser('userId') userId: string,
    @Body() markReadDto: MarkReadDto,
  ) {
    return this.chatService.markMessagesAsRead(userId, markReadDto);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get count of unread messages' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadCount(@CurrentUser('userId') userId: string) {
    return this.chatService.getUnreadCount(userId);
  }
}
