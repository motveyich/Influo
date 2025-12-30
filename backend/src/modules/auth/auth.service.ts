import { Injectable, UnauthorizedException, ConflictException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { SignupDto, LoginDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('❌ CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be configured!');
      this.logger.error('Please add these environment variables to your Vercel deployment:');
      this.logger.error('  - JWT_SECRET (minimum 32 characters)');
      this.logger.error('  - JWT_REFRESH_SECRET (minimum 32 characters, different from JWT_SECRET)');
      throw new Error('Missing required JWT configuration');
    }

    this.logger.log('✅ JWT configuration verified');
  }

  async signup(signupDto: SignupDto) {
    const supabase = this.supabaseService.getClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupDto.email,
      password: signupDto.password,
    });

    if (authError) {
      this.logger.error(`Signup failed: ${authError.message}`, authError);
      if (authError.message.includes('already registered')) {
        throw new ConflictException('User with this email already exists');
      }
      throw new UnauthorizedException(authError.message);
    }

    if (!authData.user) {
      throw new UnauthorizedException('Failed to create user');
    }

    const adminClient = this.supabaseService.getAdminClient();
    const { error: profileError } = await adminClient
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: signupDto.email,
        full_name: signupDto.fullName || null,
        user_type: signupDto.userType || null,
        username: signupDto.username || null,
        unified_account_info: {
          isVerified: false,
          joinedAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
        },
      });

    if (profileError) {
      this.logger.error(`Profile creation failed: ${profileError.message}`, profileError);
      try {
        await adminClient.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        this.logger.error(`Failed to rollback user creation: ${deleteError}`);
      }
      throw new ConflictException('Failed to create user profile');
    }

    const tokens = await this.generateTokens({
      sub: authData.user.id,
      email: signupDto.email,
      userType: signupDto.userType || null,
    });

    return {
      user: {
        id: authData.user.id,
        email: signupDto.email,
        fullName: signupDto.fullName || null,
        userType: signupDto.userType || null,
      },
      ...tokens,
    };
  }

  async login(loginDto: LoginDto) {
    const supabase = this.supabaseService.getClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: loginDto.email,
      password: loginDto.password,
    });

    if (authError || !authData.user) {
      this.logger.error(`Login failed: ${authError?.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const adminClient = this.supabaseService.getAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found');
    }

    await adminClient
      .from('user_profiles')
      .update({
        unified_account_info: {
          ...profile.unified_account_info,
          lastActive: new Date().toISOString(),
        },
      })
      .eq('user_id', authData.user.id);

    const tokens = await this.generateTokens({
      sub: authData.user.id,
      email: profile.email,
      userType: profile.user_type,
    });

    return {
      user: {
        id: profile.user_id,
        email: profile.email,
        fullName: profile.full_name,
        userType: profile.user_type,
        avatar: profile.avatar,
      },
      ...tokens,
    };
  }

  async logout(userId: string) {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      this.logger.error(`Logout failed: ${error.message}`);
      throw new UnauthorizedException('Logout failed');
    }

    return { message: 'Logged out successfully' };
  }

  async refreshToken(refreshToken: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const adminClient = this.supabaseService.getAdminClient();
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('user_type')
      .eq('user_id', data.user.id)
      .maybeSingle();

    const tokens = await this.generateTokens({
      sub: data.user.id,
      email: data.user.email!,
      userType: profile?.user_type || null,
    });

    return tokens;
  }

  async getCurrentUser(userId: string) {
    const adminClient = this.supabaseService.getAdminClient();

    const { data: profile, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !profile) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: profile.user_id,
      email: profile.email,
      fullName: profile.full_name,
      username: profile.username,
      userType: profile.user_type,
      avatar: profile.avatar,
      bio: profile.bio,
      location: profile.location,
      unifiedAccountInfo: profile.unified_account_info,
    };
  }

  private async generateTokens(payload: JwtPayload) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('JWT_SECRET or JWT_REFRESH_SECRET is not configured');
      throw new Error('JWT configuration is missing. Please configure JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    }

    try {
      const accessToken = this.jwtService.sign(payload, {
        secret: jwtSecret,
        expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '1h',
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      });

      return {
        accessToken,
        refreshToken,
        expiresIn: parseInt(this.configService.get<string>('JWT_EXPIRATION') || '3600'),
      };
    } catch (error) {
      this.logger.error('Failed to generate tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }
}
