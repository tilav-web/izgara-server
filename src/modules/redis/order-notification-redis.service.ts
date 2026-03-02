import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_TTL } from '../../utils/constants';
import { OrderNotificationPayload } from '../socket/gateways/order/constants';

@Injectable()
export class OrderNotificationRedisService {
  private readonly KEY = 'order_notifications';

  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async pushNotification({
    payload,
    ttl = CACHE_TTL.ORDER_NOTIFICATIONS_TTL,
    max_items = CACHE_TTL.ORDER_NOTIFICATIONS_MAX_ITEMS,
  }: {
    payload: OrderNotificationPayload;
    ttl?: number;
    max_items?: number;
  }) {
    const safeMaxItems = Math.max(1, max_items);
    const value = JSON.stringify(payload);

    await this.redis
      .multi()
      .lpush(this.KEY, value)
      .ltrim(this.KEY, 0, safeMaxItems - 1)
      .expire(this.KEY, ttl)
      .exec();
  }

  async getNotifications({
    page = 1,
    limit = 50,
  }: {
    page?: number;
    limit?: number;
  }) {
    const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(200, Math.max(1, limit))
      : 50;
    const start = (safePage - 1) * safeLimit;
    const end = start + safeLimit - 1;

    const notifications = await this.redis.lrange(this.KEY, start, end);

    return notifications
      .map((item) => {
        try {
          return JSON.parse(item) as OrderNotificationPayload;
        } catch {
          return null;
        }
      })
      .filter((item): item is OrderNotificationPayload => item !== null);
  }
}
