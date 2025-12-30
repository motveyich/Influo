import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided');
    }

    // Backend использует ТОЛЬКО Service Role Key для полного доступа
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log('✅ Supabase client initialized with Service Role Key');
    this.logger.log(`📡 Connected to: ${supabaseUrl}`);
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized');
    }
    return this.client;
  }

  /**
   * @deprecated Use getClient() instead. Backend now uses only Service Role Key.
   * This method is kept for backward compatibility.
   */
  getAdminClient(): SupabaseClient {
    return this.getClient();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('user_profiles')
        .select('user_id')
        .limit(1);

      if (error) {
        this.logger.error('Health check failed:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Supabase health check failed:', error);
      return false;
    }
  }
}
