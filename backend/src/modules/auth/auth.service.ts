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

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: signupDto.email,
      password: signupDto.password,
      email_confirm: true,
      user_metadata: {
        full_name: signupDto.fullName,
        user_type: signupDto.userType,
      },
    });

    if (authError) {
      this.logger.error(`Signup failed: ${authError.message}`, authError);
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        throw new ConflictException('User with this email already exists');
      }
      throw new UnauthorizedException(authError.message);
    }

    if (!authData.user) {
      throw new UnauthorizedException('Failed to create user');
    }

    const adminClient = this.supabaseService.getAdminClient();

    // Check if profile already exists (including deleted ones)
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    let profileError;

    if (existingProfile && existingProfile.is_deleted) {
      // Restore deleted profile
      this.logger.log(`Restoring deleted profile for user ${authData.user.id}`);
      const { error } = await adminClient
        .from('user_profiles')
        .update({
          email: signupDto.email,
          full_name: signupDto.fullName || null,
          user_type: signupDto.userType || null,
          username: signupDto.username || null,
          is_deleted: false,
          deleted_at: null,
          deleted_by: null,
          unified_account_info: {
            isVerified: false,
            joinedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
          },
        })
        .eq('user_id', authData.user.id);
      profileError = error;
    } else if (existingProfile) {
      // Profile exists and is not deleted - update lastActive
      this.logger.log(`Profile already exists for user ${authData.user.id}, updating lastActive`);
      const { error } = await adminClient
        .from('user_profiles')
        .update({
          unified_account_info: {
            ...existingProfile.unified_account_info,
            lastActive: new Date().toISOString(),
          },
        })
        .eq('user_id', authData.user.id)
        .eq('is_deleted', false);
      profileError = error;
    } else {
      // Create new profile
      this.logger.log(`Creating new profile for user ${authData.user.id}`);
      const { error } = await adminClient
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
      profileError = error;
    }

    if (profileError) {
      this.logger.error(`Profile creation failed: ${profileError.message}`, profileError);

      if (profileError.code === '23505' && profileError.message.includes('username')) {
        throw new ConflictException('Username already taken');
      }

      try {
        await adminClient.auth.admin.deleteUser(authData.user.id);
      } catch (deleteError) {
        this.logger.error(`Failed to rollback user creation: ${deleteError}`);
      }
      throw new ConflictException(`Failed to create user profile: ${profileError.message}`);
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
        username: signupDto.username || null,
        userType: signupDto.userType || null,
        avatar: null,
        isDeleted: false,
        deletedAt: null,
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
      .eq('is_deleted', false)
      .maybeSingle();

    if (profileError || !profile) {
      throw new UnauthorizedException('User profile not found or account has been deleted');
    }

    // Check if profile is deleted (double check for safety)
    if (profile.is_deleted) {
      throw new UnauthorizedException('Account has been deleted. Please contact support.');
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
        isDeleted: profile.is_deleted || false,
        deletedAt: profile.deleted_at || null,
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
      .eq('is_deleted', false)
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
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !profile) {
      throw new UnauthorizedException('User not found or account has been deleted');
    }

    if (profile.is_deleted) {
      throw new UnauthorizedException('Account has been deleted. Please contact support.');
    }

    // Load user role
    let role = 'user';
    try {
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (roleData) {
        role = roleData.role;
      } else if (profile.role) {
        role = profile.role;
      }
    } catch (err) {
      console.error('[AuthService] Failed to load user role:', err);
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
      isDeleted: profile.is_deleted || false,
      deletedAt: profile.deleted_at || null,
      role: role,
    };
  }

  private async generateTokens(payload: JwtPayload) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    const jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const jwtExpiration = this.configService.get<string>('JWT_EXPIRATION') || '86400'; // 24 hours default

    console.log('🔐 [AuthService] Generating tokens with secret:', jwtSecret ? `${jwtSecret.substring(0, 4)}...` : 'UNDEFINED');
    console.log('🔐 [AuthService] JWT_EXPIRATION:', jwtExpiration);

    if (!jwtSecret || !jwtRefreshSecret) {
      this.logger.error('JWT_SECRET or JWT_REFRESH_SECRET is not configured');
      throw new Error('JWT configuration is missing. Please configure JWT_SECRET and JWT_REFRESH_SECRET environment variables.');
    }

    try {
      const accessToken = this.jwtService.sign(payload, {
        secret: jwtSecret,
        expiresIn: jwtExpiration,
      });

      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
      });

      console.log('✅ [AuthService] Tokens generated successfully for user:', payload.email);

      return {
        accessToken,
        refreshToken,
        expiresIn: parseInt(jwtExpiration),
      };
    } catch (error) {
      this.logger.error('Failed to generate tokens:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }
}
