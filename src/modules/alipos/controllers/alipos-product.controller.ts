import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AliPosProductService } from "../services/alipos-product.service";

@ApiTags('Alipos')
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