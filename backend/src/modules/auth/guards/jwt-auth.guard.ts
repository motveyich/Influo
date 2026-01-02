import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('🔒 [JwtAuthGuard] Checking authentication for:', request.method, request.url);
    console.log('🔑 [JwtAuthGuard] Authorization header present:', !!authHeader);

    if (authHeader) {
      console.log('🔑 [JwtAuthGuard] Header format:', authHeader.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ [JwtAuthGuard] No Authorization header found in request');
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any) {
    const request = context?.switchToHttp?.()?.getRequest();

    if (err || !user) {
      console.error('❌ [JwtAuthGuard] ========== AUTHENTICATION FAILED ==========');
      console.error('❌ [JwtAuthGuard] Error:', err?.message || 'No error object');
      console.error('❌ [JwtAuthGuard] Info:', info?.message || info || 'No info');
      console.error('❌ [JwtAuthGuard] User present:', !!user);

      if (request) {
        console.error('❌ [JwtAuthGuard] Request URL:', request.method, request.url);
        console.error('❌ [JwtAuthGuard] Auth header:', request.headers.authorization ? 'Present' : 'Missing');
      }

      console.error('❌ [JwtAuthGuard] ==========================================');

      throw err || new UnauthorizedException('Invalid or expired token');
    }

    console.log('✅ [JwtAuthGuard] Authentication successful for user:', user.email);
    return user;
  }
}
