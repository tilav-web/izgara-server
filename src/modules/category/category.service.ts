import { Injectable } from "@nestjs/common";
import { AliPosCategoryService } from "../alipos/services/alipos-category.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Category } from "./category.entity";
import { Repository } from "typeorm";

@Injectable()
export class CategoryService {
    constructor(
        @InjectRepository(Category) private readonly repository: Repository<Category>
    ) { }

    async findAll() {
        return this.repository.find()
    }

    async upsertMany(data: {
        id: string,
        name: string,
        sort_order: number
    }[]) {
        return this.repository.upsert(data, ['id'])
    }

}