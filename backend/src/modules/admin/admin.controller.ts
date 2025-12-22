import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { AdminService } from './admin.service';
import { BlockUserDto, SearchUsersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get all users (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllUsers(@Query() filters: SearchUsersDto) {
    return this.adminService.getAllUsers(filters);
  }

  @Post('users/:userId/block')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Block a user (admin/moderator only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user to block' })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async blockUser(
    @CurrentUser('userId') adminId: string,
    @Param('userId') userId: string,
    @Body() blockUserDto: BlockUserDto,
  ) {
    return this.adminService.blockUser(adminId, userId, blockUserDto);
  }

  @Patch('users/:userId/unblock')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Unblock a user (admin/moderator only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user to unblock' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async unblockUser(
    @CurrentUser('userId') adminId: string,
    @Param('userId') userId: string,
  ) {
    return this.adminService.unblockUser(adminId, userId);
  }

  @Get('logs')
  @Roles('admin')
  @ApiOperation({ summary: 'Get admin action logs (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAdminLogs(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.adminService.getAdminLogs(limit, offset);
  }

  @Get('stats')
  @Roles('admin', 'moderator')
  @ApiOperation({ summary: 'Get platform statistics (admin/moderator only)' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getPlatformStats() {
    return this.adminService.getPlatformStats();
  }
}
