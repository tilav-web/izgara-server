import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "./product.entity";
import { Between, FindOptionsWhere, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { MeasureEnum } from "./enums/measure.enum";
import { FindAllFilterDto } from "./dto/find-all-filter.dto";

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product) private readonly repository: Repository<Product>
    ) { }

    async upsertMany(data: { id: string; category_id: string; name: string; description: string; price: number; vat: number; measure: number; measure_unit: MeasureEnum; sort_order: number }[]) {
        return this.repository.upsert(data, ['id'])
    }

    async findAll({ page = 1, limit = 10, category_id, price_min, price_max }: FindAllFilterDto) {
        const filter: FindOptionsWhere<Product> = {}
        if (category_id) filter.category_id = category_id

        if (price_min && price_max) {
            if (price_min > price_max) {
                throw new BadRequestException("Narx bo'yicha qidirish uchun min va max mantiqan to'g'ri bo'lishi kerak!")
            }
            filter.price = Between(price_min, price_max)
        } else if (price_min) {
            filter.price = MoreThanOrEqual(price_min);
        } else if (price_max) {
            filter.price = LessThanOrEqual(price_max);
        }

        const skip = (page - 1) * limit;

        const [products, total] = await this.repository.findAndCount({
            where: filter,
            take: limit,
            skip,
            order: { created_at: "DESC" }
        })
        return {
            products,
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit)
        }
    }
}