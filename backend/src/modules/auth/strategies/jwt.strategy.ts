import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SupabaseService } from '../../../shared/supabase/supabase.service';

export interface JwtPayload {
  sub: string;
  email: string;
  userType: string | null;
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
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    console.log('🔐 [JwtStrategy] Validating token with secret:', jwtSecret ? `${jwtSecret.substring(0, 4)}...` : 'UNDEFINED');
    console.log('🔐 [JwtStrategy] Payload:', { sub: payload.sub, email: payload.email, exp: payload.exp });

    if (!payload.sub || !payload.email) {
      console.error('❌ [JwtStrategy] Invalid token payload - missing sub or email');
      throw new UnauthorizedException('Invalid token payload');
    }

    const supabase = this.supabaseService.getAdminClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, user_type, avatar')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (error || !user) {
      console.error('❌ [JwtStrategy] User not found:', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    console.log('✅ [JwtStrategy] Token validated successfully for user:', user.email);

    return {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      userType: user.user_type,
      avatar: user.avatar,
    };
  }
}
