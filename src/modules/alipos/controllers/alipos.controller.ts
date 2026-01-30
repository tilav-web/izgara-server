import { Controller, Get, UseGuards } from "@nestjs/common";
import { AliPosService } from "../services/alipos.service";
import { AuthGuard } from "@nestjs/passport";
import { AuthRoleGuard } from "../../auth/guard/role.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { AuthRoleEnum } from "../../auth/enums/auth-role.enum";

@Controller('alipos')
export class AliPosController {
    constructor(
        private readonly aliPosService: AliPosService,
    ) { }

    @Get()
    @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
    @Roles(AuthRoleEnum.SUPERADMIN)
    async findAllAliposData() {
        return this.aliPosService.updateAllData()
    }

}