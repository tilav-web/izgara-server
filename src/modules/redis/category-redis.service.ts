import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Category } from '../category/category.entity';
import { CACHE_TTL } from '../../utils/constants';

@Injectable()
export class CategoryRedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  private readonly KEY = 'categories';

  // Hammasini bittada saqlash (20 ta uchun muammo emas)
  async setCategories(categories: Category[]) {
    await this.redis.setex(
      this.KEY,
      CACHE_TTL.CATEGORIES_DETAILS,
      JSON.stringify(categories),
    );
  }

  // Hammasini olish
  async getAllCategories(): Promise<Category[] | null> {
    const data = await this.redis.get(this.KEY);
    return data ? (JSON.parse(data) as Category[]) : null;
  }

  // ID bo'yicha olish (20 ta bo'lgani uchun tez ishlaydi)
  async getCategoryById(id: string): Promise<Category | null> {
    const categories = await this.getAllCategories();
    if (!categories) return null;
    return categories.find((c) => c.id === id) || null;
  }

  async invalidate() {
    await this.redis.del(this.KEY);
  }
}
