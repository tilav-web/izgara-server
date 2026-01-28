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

}