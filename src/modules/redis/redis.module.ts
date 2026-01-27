import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RedisOtpService } from "./redis-otp.service";
import { RedisAuthService } from "./redis-auth.service";

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
        RedisOtpService,
        RedisAuthService
    ],
    exports: ['REDIS_CLIENT', RedisOtpService, RedisAuthService]
})
export class RedisModule { }