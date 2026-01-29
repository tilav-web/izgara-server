import { Controller, Get } from "@nestjs/common";
import { CategoryService } from "./cotegory.service";

@Controller('categories')
export class CategoryController {
    constructor(
        private readonly categoryService: CategoryService
    ) { }

    @Get()
    async findAll() {
        return this.categoryService.findAll()
    }
}