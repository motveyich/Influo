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
    console.log('🔐 [JwtStrategy] ========== TOKEN VALIDATION START ==========');
    console.log('🔐 [JwtStrategy] Secret configured:', jwtSecret ? `${jwtSecret.substring(0, 4)}...` : 'UNDEFINED');
    console.log('🔐 [JwtStrategy] Payload received:', {
      sub: payload.sub,
      email: payload.email,
      userType: payload.userType,
      iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A',
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
      expired: payload.exp ? Date.now() / 1000 > payload.exp : 'N/A',
    });

    if (!payload.sub || !payload.email) {
      console.error('❌ [JwtStrategy] VALIDATION FAILED: Missing sub or email in payload');
      console.error('❌ [JwtStrategy] Payload details:', JSON.stringify(payload));
      throw new UnauthorizedException('Invalid token payload - missing required fields');
    }

    // Check token expiration explicitly
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.error('❌ [JwtStrategy] VALIDATION FAILED: Token expired');
      console.error('❌ [JwtStrategy] Expired at:', new Date(payload.exp * 1000).toISOString());
      console.error('❌ [JwtStrategy] Current time:', new Date().toISOString());
      throw new UnauthorizedException('Token has expired');
    }

    console.log('🔍 [JwtStrategy] Fetching user from database:', payload.sub);

    const supabase = this.supabaseService.getAdminClient();
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, user_type, avatar')
      .eq('user_id', payload.sub)
      .maybeSingle();

    if (error) {
      console.error('❌ [JwtStrategy] VALIDATION FAILED: Database error:', error.message);
      throw new UnauthorizedException('Failed to verify user');
    }

    if (!user) {
      console.error('❌ [JwtStrategy] VALIDATION FAILED: User not found in database');
      console.error('❌ [JwtStrategy] Searched for user_id:', payload.sub);
      throw new UnauthorizedException('User not found');
    }

    console.log('✅ [JwtStrategy] Token validated successfully');
    console.log('✅ [JwtStrategy] User:', {
      id: user.user_id,
      email: user.email,
      type: user.user_type,
    });
    console.log('🔐 [JwtStrategy] ========== TOKEN VALIDATION END ==========');

    return {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      userType: user.user_type,
      avatar: user.avatar,
    };
  }
}
