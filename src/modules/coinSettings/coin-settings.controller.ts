import { Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { CoinSettingsService } from "./coin-settings.service";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../auth/decorators/roles.decorator";
import { AuthRoleEnum } from "../auth/enums/auth-role.enum";
import { AuthRoleGuard } from "../auth/guard/role.guard";


@Controller('coin-settings')
export class CoinSettingsController {
    constructor(private readonly coinSettingsService: CoinSettingsService) { }

    @Get()
    async findCoinSetting() {
        return this.coinSettingsService.findCoinSettings()
    }

    @Patch('/update')
    @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
    @Roles(AuthRoleEnum.SUPERADMIN)
    async updateCoinSettings() {

    }
}