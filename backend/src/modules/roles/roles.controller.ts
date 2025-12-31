import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesService } from './roles.service';
import { AssignRoleDto } from './dto';

@Controller('roles')
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get(':userId')
  async getUserRole(@Param('userId') userId: string) {
    const role = await this.rolesService.getUserRole(userId);
    return { role };
  }

  @Post('assign')
  @Roles('admin')
  async assignRole(
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() user: any
  ) {
    return this.rolesService.assignRole(
      assignRoleDto.userId,
      assignRoleDto.role,
      user.id
    );
  }

  @Delete(':userId')
  @Roles('admin')
  async removeRole(
    @Param('userId') userId: string,
    @CurrentUser() user: any
  ) {
    await this.rolesService.removeRole(userId, user.id);
    return { message: 'Role removed successfully' };
  }

  @Get()
  @Roles('admin')
  async getUsersWithRoles() {
    return this.rolesService.getUsersWithRoles();
  }

  @Get(':userId/check/:requiredRole')
  async checkPermission(
    @Param('userId') userId: string,
    @Param('requiredRole') requiredRole: string
  ) {
    const hasPermission = await this.rolesService.checkPermission(userId, requiredRole);
    return { hasPermission };
  }
}
