import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { CACHE_TTL } from '../../utils/constants';

@Injectable()
export class OtpRedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async setOtpByPhone({
    phone,
    code,
    ttl = CACHE_TTL.OTP_TTL,
  }: {
    phone: string;
    code: number;
    ttl?: number;
  }): Promise<void> {
    const key = `otp:phone:${phone}`;
    await this.redis.setex(key, ttl, code);
  }

  async getOtpByPhone(phone: string) {
    const key = `otp:phone:${phone}`;
    return await this.redis.get(key);
  }

  async deleteOtp(phone: string) {
    const key = `otp:phone:${phone}`;
    await this.redis.del(key);
  }

  async getOtpTTLByPhone(phone: string): Promise<number> {
    const key = `otp:phone:${phone}`;
    return await this.redis.ttl(key);
  }

  async verifyOtpByPhone({
    phone,
    code,
  }: {
    phone: string;
    code: number;
  }): Promise<0 | 1 | 2> {
    const key = `otp:phone:${phone}`;
    const storedCode = await this.redis.get(key);

    const ttl = await this.getOtpTTLByPhone(phone);

    if (!storedCode || ttl < 5) {
      return 2; // agar vaqt tugagan bo'lsa yoki kod bo'lmasa 2 qaytariladi va bu xato
    }

    if (storedCode !== code.toString()) {
      return 0; // agar kod xato bo'lsa 0 qaytariladi
    }

    await this.redis.del(key);
    return 1; // agar kod to'g'ri bo'lsa 1 qaytariladi
  }
}
