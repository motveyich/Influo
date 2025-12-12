import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../../shared/supabase/supabase.service';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      console.error('JWT_SECRET is not configured! Authentication will fail.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || 'fallback-secret-for-debugging',
    });

    this.logger.log(`JWT Strategy initialized. Secret configured: ${!!jwtSecret}`);
  }

  async validate(payload: JwtPayload) {
    this.logger.debug(`Validating JWT payload for user: ${payload.sub}`);

    if (!payload.sub || !payload.email) {
      this.logger.error('Invalid token payload - missing sub or email');
      throw new UnauthorizedException('Invalid token payload');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, user_type, avatar')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (error) {
      this.logger.error(`Database error: ${error.message}`);
      throw new UnauthorizedException('Database error');
    }

    if (!user) {
      this.logger.error(`User not found: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }

    this.logger.debug(`User validated: ${user.email}`);

    return {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      userType: user.user_type,
      avatar: user.avatar,
    };
  }
}
