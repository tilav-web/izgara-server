import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { CACHE_TTL } from "../../utils/constants";
import { Auth } from "../auth/auth.entity";
import { User } from "../user/user.entity";
import { CoinSettings } from "../coinSettings/coin-settings.entity";

@Injectable()
export class UserRedisService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis
    ) { }

    async getCoinSettings() {
        const key = 'coin_settings_cache'
        return this.redis.get(key)
    }

    async setCoinSettings({ coinSettings, ttl }: { coinSettings: CoinSettings, ttl: number }) {
        const key = 'coin_settings_cache'
        const stringCoinSettings = JSON.stringify(coinSettings)
        await this.redis.setex(key, ttl, stringCoinSettings)
    }

}