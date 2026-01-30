import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { CACHE_TTL } from "../../utils/constants";
import { CoinSettings } from "../coinSettings/coin-settings.entity";

@Injectable()
export class CoinSettingsRedisService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis
    ) { }

    async getCoinSettings() {
        const key = 'coin_settings_cache'
        const coinSettings = await this.redis.get(key)
        if (!coinSettings) return null
        return JSON.parse(coinSettings)
    }

    async setCoinSettings({ coinSettings, ttl = CACHE_TTL.COIN_SETTINGS_DETAILS }: { coinSettings: CoinSettings, ttl?: number }) {
        const key = 'coin_settings_cache'
        const stringCoinSettings = JSON.stringify(coinSettings)
        await this.redis.setex(key, ttl, stringCoinSettings)
    }
}