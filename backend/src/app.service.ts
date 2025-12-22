import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './shared/supabase/supabase.service';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private supabaseService: SupabaseService,
  ) {}

  getHealth(): { message: string; status: string; timestamp: string } {
    return {
      message: 'Influo Platform API is running',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  async getDetailedHealth() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const hasAnonKey = !!this.configService.get<string>('SUPABASE_ANON_KEY');
    const hasServiceKey = !!this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const hasJwtSecret = !!this.configService.get<string>('JWT_SECRET');

    let supabaseConnected = false;
    try {
      supabaseConnected = await this.supabaseService.healthCheck();
    } catch (e) {
      supabaseConnected = false;
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      config: {
        supabaseUrl: supabaseUrl ? supabaseUrl.replace(/^(https?:\/\/[^\/]+).*$/, '$1') : 'NOT SET',
        hasAnonKey,
        hasServiceKey,
        hasJwtSecret,
      },
      services: {
        supabase: supabaseConnected ? 'connected' : 'disconnected',
      },
    };
  }
}
