import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, user_type, avatar')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      userType: user.user_type,
      avatar: user.avatar,
    };
  }
}
