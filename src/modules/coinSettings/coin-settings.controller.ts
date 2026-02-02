import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CoinSettingsService } from './coin-settings.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { UpdateCoinSettingsDto } from './dto/update-coin-settings.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('coin-settings')
export class CoinSettingsController {
  constructor(private readonly coinSettingsService: CoinSettingsService) {}

  @Get()
  async findCoinSetting() {
    return this.coinSettingsService.findCoinSettings();
  }

  @Patch('/update')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async updateCoinSettings(@Body() body: UpdateCoinSettingsDto) {
    return this.coinSettingsService.updateCoinSettings(body);
  }
}
