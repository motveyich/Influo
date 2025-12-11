import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    getClient: jest.fn(),
    getAdminClient: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('should create a new user successfully', async () => {
      const signupDto = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
        userType: 'influencer' as const,
      };

      const mockAuthResponse = {
        data: {
          user: { id: 'user-id', email: signupDto.email },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      };

      const mockClient = {
        auth: {
          signUp: jest.fn().mockResolvedValue(mockAuthResponse),
        },
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { user_id: 'user-id', full_name: signupDto.fullName },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.signup(signupDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockClient.auth.signUp).toHaveBeenCalledWith({
        email: signupDto.email,
        password: signupDto.password,
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const signupDto = {
        email: 'existing@example.com',
        password: 'password123',
        fullName: 'Test User',
        userType: 'influencer' as const,
      };

      const mockClient = {
        auth: {
          signUp: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'User already registered' },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResponse = {
        data: {
          user: { id: 'user-id', email: loginDto.email },
          session: { access_token: 'token', refresh_token: 'refresh' },
        },
        error: null,
      };

      const mockClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue(mockAuthResponse),
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { user_id: 'user-id', full_name: 'Test User' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: loginDto.email,
        password: loginDto.password,
      });
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid credentials' },
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      const mockClient = {
        auth: {
          refreshSession: jest.fn().mockResolvedValue({
            data: {
              session: {
                access_token: 'new-access-token',
                refresh_token: 'new-refresh-token',
              },
            },
            error: null,
          }),
        },
      };

      mockSupabaseService.getClient.mockReturnValue(mockClient);

      const result = await service.refreshToken(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });
  });
});
