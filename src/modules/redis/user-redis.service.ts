import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_TTL } from '../../utils/constants';
import { User } from '../user/user.entity';

@Injectable()
export class UserRedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async setUserDetails({
    user,
    auth_id,
    ttl = CACHE_TTL.USER_DETAILS,
  }: {
    user: User;
    auth_id: number;
    ttl?: number;
  }) {
    const key = `user:auth_id:${auth_id}`;
    await this.redis.setex(key, ttl, JSON.stringify(user));
  }

  async getUserDetails(auth_id: number) {
    const key = `user:auth_id:${auth_id}`;
    const user = await this.redis.get(key);
    if (!user) return null;
    return JSON.parse(user) as User;
  }

  async setUserWithSocketClientId({
    user_id,
    client_id,
    ttl = CACHE_TTL.USER_SOCKET_CLIENT_TTL,
  }: {
    user_id: number;
    client_id: string;
    ttl?: number;
  }) {
    const key = `user_sockets:${user_id}`;

    // SADD - to'plamga yangi socket_id qo'shadi
    await this.redis.sadd(key, client_id);

    // Har safar yangi ulanish bo'lganda TTL ni yangilaymiz
    await this.redis.expire(key, ttl);
  }

  /**
   * Foydalanuvchi uzilganda faqat o'sha client_id ni o'chirish
   */
  async removeSocketClientId(user_id: number, client_id: string) {
    const key = `user_sockets:${user_id}`;

    // SREM - to'plamdan faqat bitta socket_id ni o'chiradi
    await this.redis.srem(key, client_id);
  }

  /**
   * Foydalanuvchining barcha aktiv socket_id larini olish
   */
  async getUserSocketClients(user_id: number): Promise<string[]> {
    const key = `user_sockets:${user_id}`;

    // SMEMBERS - to'plamdagi barcha socket_id larni qaytaradi
    return await this.redis.smembers(key);
  }
}
