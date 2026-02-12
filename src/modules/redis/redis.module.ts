import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OtpRedisService } from './otp-redis.service';
import { AuthRedisService } from './auth-redis.service';
import { UserRedisService } from './user-redis.service';
import { CoinSettingsRedisService } from './coin-settings-redis.service';
import { CategoryRedisService } from './category-redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService) => {
        return new Redis({
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          keyPrefix: 'izgara',
        });
      },
      inject: [ConfigService],
    },
    OtpRedisService,
    AuthRedisService,
    UserRedisService,
    CoinSettingsRedisService,
    CategoryRedisService,
  ],
  exports: [
    'REDIS_CLIENT',
    OtpRedisService,
    AuthRedisService,
    UserRedisService,
    CoinSettingsRedisService,
    CategoryRedisService,
  ],
})
export class RedisModule {}
