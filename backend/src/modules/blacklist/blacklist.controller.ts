import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BlacklistService } from './blacklist.service';
import { CreateBlacklistDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('blacklist')
@ApiBearerAuth('JWT-auth')
@Controller('blacklist')
export class BlacklistController {
  constructor(private blacklistService: BlacklistService) {}

  @Post()
  @ApiOperation({ summary: 'Block a user' })
  @ApiResponse({ status: 201, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Cannot block yourself' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User already blocked' })
  blockUser(@CurrentUser('userId') userId: string, @Body() createDto: CreateBlacklistDto) {
    return this.blacklistService.blockUser(userId, createDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Unblock a user by blacklist entry ID' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Blacklist entry not found' })
  unblockUser(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.blacklistService.unblockUser(userId, id);
  }

  @Delete('by-user/:blockedUserId')
  @ApiOperation({ summary: 'Unblock a user by their user ID' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 404, description: 'Blacklist entry not found' })
  unblockUserByUserId(@Param('blockedUserId') blockedUserId: string, @CurrentUser('userId') userId: string) {
    return this.blacklistService.unblockUserByUserId(userId, blockedUserId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all blocked users' })
  @ApiResponse({ status: 200, description: 'Blacklist retrieved successfully' })
  findAll(@CurrentUser('userId') userId: string) {
    return this.blacklistService.findAll(userId);
  }

  @Get('check/:targetUserId')
  @ApiOperation({ summary: 'Check if user is blocked' })
  @ApiResponse({ status: 200, description: 'Check completed successfully' })
  async isBlocked(@CurrentUser('userId') userId: string, @Param('targetUserId') targetUserId: string) {
    const isBlocked = await this.blacklistService.isBlocked(userId, targetUserId);
    return { isBlocked };
  }
}
