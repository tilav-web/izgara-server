import { Controller, Get } from "@nestjs/common";
import { AliPosService } from "../services/alipos.service";

@Controller('alipos')
export class AliPosController {
    constructor(
        private readonly aliPosService: AliPosService,
    ) { }

    @Get()
    async findAllAliposData() {
        return this.aliPosService.updateAllData()
    }

}