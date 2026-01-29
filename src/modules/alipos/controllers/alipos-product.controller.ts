import { Controller, Get } from "@nestjs/common";

@Controller('alipos/product')
export class AliPosProductController {
    constructor(
    ) { }

    @Get()
    async writeToDb() {

    }
}