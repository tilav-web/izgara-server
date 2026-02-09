import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { DeliverySettingsService } from './delivery-settings.service';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { AuthStatusGuard } from '../auth/guard/status.guard';

@Controller('delivery-settings')
@UseInterceptors(ClassSerializerInterceptor)
export class DeliverySettingsController {
  constructor(
    private readonly deliverySettingsService: DeliverySettingsService,
  ) {}

  @Get()
  findSettings() {
    return this.deliverySettingsService.findSettings();
  }

  @Patch()
  @Roles(AuthRoleEnum.SUPERADMIN)
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  update(@Body() updateDto: UpdateDeliverySettingsDto) {
    return this.deliverySettingsService.update(updateDto);
  }
}
