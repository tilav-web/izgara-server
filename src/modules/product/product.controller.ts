import { Controller, Get, Query } from "@nestjs/common";
import { ProductService } from "./product.service";
import { FindAllFilterDto } from "./dto/find-all-filter.dto";

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Get()
    async findAll(@Query() dto: FindAllFilterDto) {
        return this.productService.findAll(dto)
    }

}