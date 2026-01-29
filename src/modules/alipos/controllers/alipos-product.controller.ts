import { Controller, Get } from "@nestjs/common";
import { AliPosProductService } from "../services/alipos-product.service";

@Controller('alipos/product')
export class AliPosProductController {
    constructor(
        private readonly aliposProductService: AliPosProductService
    ) { }

    @Get()
    async writeToDb() {
        return this.aliposProductService.writeToDb()
    }
}