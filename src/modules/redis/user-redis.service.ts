import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_TTL } from '../../utils/constants';
import { Auth } from '../auth/auth.entity';
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
    return JSON.parse(user);
  }
}
