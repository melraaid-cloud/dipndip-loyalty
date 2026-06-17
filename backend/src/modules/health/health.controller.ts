import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Public } from '../../common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get()
  async check() {
    const dbOk = await this.dataSource
      .query('SELECT 1')
      .then(() => true)
      .catch(() => false);

    let redisOk = false;
    try {
      const client = createClient({
        socket: {
          host: this.configService.get('redis.host', 'localhost'),
          port: this.configService.get('redis.port', 6379),
        },
        password: this.configService.get('redis.password') || undefined,
      });
      await client.connect();
      const pong = await client.ping();
      redisOk = pong === 'PONG';
      await client.disconnect();
    } catch {
      redisOk = false;
    }

    const status = dbOk && redisOk ? 'ok' : 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor(process.uptime()),
      services: {
        database: dbOk ? 'ok' : 'error',
        redis: redisOk ? 'ok' : 'error',
      },
    };
  }
}
