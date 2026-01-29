import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Product } from "./product.entity";
import { Repository } from "typeorm";
import { MeasureEnum } from "./enums/measure.enum";

@Injectable()
export class ProductService {
    constructor(
        @InjectRepository(Product) private readonly repository: Repository<Product>
    ) { }

    async upsertMany(data: { id: string; category_id: string; name: string; description: string; price: number; vat: number; measure: number; measure_unit: MeasureEnum; sort_order: number }[]) {
        
    }
}