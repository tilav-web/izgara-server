import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { CACHE_TTL } from "../../utils/constants";
import { Auth } from "../auth/auth.entity";

@Injectable()
export class AuthRedisService {
    constructor(
        @Inject('REDIS_CLIENT') private readonly redis: Redis
    ) { }

    async setAuthDetails({ auth, ttl = CACHE_TTL.AUTH_DETAILS }: { auth: Auth, ttl?: number }) {
        const idKey = `auth:id:${auth.id}`;
        const phoneKey = `auth:phone:${auth.phone}`;
        const authString = JSON.stringify(auth);

        // 1. To'liq ma'lumotni ID bo'yicha saqlash
        await this.redis.setex(idKey, ttl, authString);

        // 2. Phone → ID mapping saqlash (faqat reference)
        await this.redis.setex(phoneKey, ttl, auth.id.toString());
    }

    async getAuthDetails({ id, phone }: { id?: number; phone?: string }): Promise<Auth | null> {
        let authId: number | null = null;

        // 1. Agar ID berilgan bo'lsa, to'g'ridan-to'g'ri ishlatish
        if (id) {
            authId = id;
        }
        // 2. Agar phone berilgan bo'lsa, avval ID ni olish
        else if (phone) {
            const phoneKey = `auth:phone:${phone}`;
            const cachedId = await this.redis.get(phoneKey);

            if (!cachedId) {
                return null; // Phone mapping topilmadi
            }

            authId = parseInt(cachedId);
        }
        else {
            return null; // ID ham, phone ham berilmagan
        }

        // 3. ID bo'yicha to'liq ma'lumotni olish
        const idKey = `auth:id:${authId}`;
        const authString = await this.redis.get(idKey);

        if (!authString) {
            return null;
        }

        return JSON.parse(authString) as Auth;
    }

    async deleteAuthCache({ id, phone }: { id: number, phone?: string }): Promise<void> {
        const keys = [`auth:id:${id}`];

        if (phone) {
            keys.push(`auth:phone:${phone}`);
        }

        await this.redis.del(...keys);
    }

    async setNotFoundAuth({ phone, id, ttl = CACHE_TTL.AUTH_NOT_FOUND }: { phone?: string; id?: number; ttl?: number }) {
        if (!phone && !id) throw new Error('Set not found redis funksiyasiga id yoki phone kelishi kerak!')
        if (phone) {
            const key = `auth_not_found:${phone}`
            await this.redis.setex(key, ttl, phone)
            return
        }
        if (id) {
            const key = `auth_not_found:${id}`
            await this.redis.setex(key, ttl, id)
            return
        }
    }

    async getNotFoundAuth({ phone, id }: { phone?: string; id?: number }) {
        if (id) {
            const key = `auth_not_found:${id}`
            return this.redis.get(key)
        }
        if (phone) {
            const key = `auth_not_found:${phone}`
            return this.redis.get(key)
        }
    }

}