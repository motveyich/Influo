import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    this.logger.debug(`Request: ${request.method} ${request.url} - Public: ${isPublic}`);

    if (isPublic) {
      this.logger.debug('Public endpoint, skipping authentication');
      return true;
    }

    const authHeader = request.headers.authorization;
    this.logger.debug(`Auth header present: ${!!authHeader}`);

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      this.logger.error(`Authentication failed: ${err?.message || info?.message || 'Unknown error'}`);
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    this.logger.debug(`User authenticated: ${user.email}`);
    return user;
  }
}
