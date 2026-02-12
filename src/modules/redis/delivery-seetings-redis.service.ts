import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { DeliverySettings } from '../deliverySettings/delivery-settings.entity';
import { CACHE_TTL } from '../../utils/constants';

@Injectable()
export class DeliverySettingsRedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private readonly KEY = 'delivery_settings';

  async setDeliverySettings({
    deliverySettings,
    ttl = CACHE_TTL.DELIVERY_SETTINGS_TTL,
  }: {
    deliverySettings: DeliverySettings;
    ttl?: number;
  }) {
    await this.redis.setex(this.KEY, ttl, JSON.stringify(deliverySettings));
  }

  async getDeliverySettings() {
    const deliverySettings = await this.redis.get(this.KEY);

    return deliverySettings
      ? (JSON.parse(deliverySettings) as DeliverySettings)
      : null;
  }
}
