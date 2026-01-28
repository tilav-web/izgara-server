import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { OtpRedisService } from "./otp-redis.service";
import { AuthRedisService } from "./auth-redis.service";
import { UserRedisService } from "./user-redis.service";

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: 'REDIS_CLIENT',
            useFactory: (config: ConfigService) => {
                return new Redis({
                    host: config.get('REDIS_HOST'),
                    port: config.get('REDIS_PORT')
                })
            },
            inject: [ConfigService]
        },
        OtpRedisService,
        AuthRedisService,
        UserRedisService
    ],
    exports: ['REDIS_CLIENT', OtpRedisService, AuthRedisService, UserRedisService]
})
export class RedisModule { }