import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; status: string; timestamp: string } {
    return {
      message: 'Influo Platform API is running',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }

  getDetailedHealth() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      services: {
        database: 'connected',
        cache: 'operational',
      },
    };
  }
}
