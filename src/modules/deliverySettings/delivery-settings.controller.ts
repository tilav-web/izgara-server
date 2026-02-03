import { Controller } from '@nestjs/common';
import { DeliverySettingsService } from './delivery-settings.service';

@Controller('delivery-settings')
export class DeliverySettingsController {
  constructor(
    private readonly deliverySettingsService: DeliverySettingsService,
  ) {}
}
