import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user's role from userType field
    const userRole = user.userType || 'user';

    // Check if user has any of the required roles
    // Admin has access to everything
    const hasRole = requiredRoles.some((role) => {
      if (userRole === 'admin') return true;
      if (userRole === 'moderator' && (role === 'moderator' || role === 'user')) return true;
      return userRole === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(`User must have one of these roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
