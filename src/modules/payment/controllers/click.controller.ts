import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OrderService } from '../../order/services/order.service';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { ClickService } from '../services/click.service';

@Controller('click')
export class ClickController {
  constructor(
    private readonly orderService: OrderService,
    private readonly clickService: ClickService,
  ) {}

  @Post('webhoo')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: ClickWebhookDto) {
    return this.clickService.handleWebhook(body);
  }
}
