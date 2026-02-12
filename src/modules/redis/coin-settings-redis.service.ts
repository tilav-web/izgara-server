import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_TTL } from '../../utils/constants';
import { CoinSettings } from '../coinSettings/coin-settings.entity';

@Injectable()
export class CoinSettingsRedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}
  private readonly KEY = 'coin_settings_cache';

  async getCoinSettings() {
    const coinSettings = await this.redis.get(this.KEY);
    return coinSettings ? (JSON.parse(coinSettings) as CoinSettings) : null;
  }

  async setCoinSettings({
    coinSettings,
    ttl = CACHE_TTL.COIN_SETTINGS_DETAILS,
  }: {
    coinSettings: CoinSettings;
    ttl?: number;
  }) {
    await this.redis.setex(this.KEY, ttl, JSON.stringify(coinSettings));
  }
}
