import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { RedisService } from "./redis.service";

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
        RedisService
    ],
    exports: ['REDIS_CLIENT', RedisService]
})
export class RedisModule { }