import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { AssignRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user role' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserRole(@Param('userId') userId: string) {
    return this.rolesService.getUserRole(userId);
  }

  @Post('user/:userId/assign')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign role to user (admin only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' }}
  async assignRole(
    @CurrentUser('userId') assignerId: string,
    @Param('userId') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.rolesService.assignRole(assignerId, userId, assignRoleDto);
  }

  @Delete('user/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove role from user (admin only)' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async removeRole(
    @CurrentUser('userId') removerId: string,
    @Param('userId') userId: string,
  ) {
    return this.rolesService.removeRole(removerId, userId);
  }

  @Get('users-with-roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users with assigned roles (admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsersWithRoles() {
    return this.rolesService.getUsersWithRoles();
  }

  @Get('check-permission/:userId')
  @ApiOperation({ summary: 'Check if user has required permission' })
  @ApiParam({ name: 'userId', description: 'ID of the user' })
  @ApiQuery({ name: 'requiredRole', description: 'Required role', enum: ['user', 'moderator', 'admin'] })
  @ApiResponse({ status: 200, description: 'Permission check completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkPermission(
    @Param('userId') userId: string,
    @Query('requiredRole') requiredRole: string,
  ) {
    return this.rolesService.checkPermission(userId, requiredRole);
  }
}
