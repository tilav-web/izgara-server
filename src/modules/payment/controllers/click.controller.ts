import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthStatusGuard } from '../../auth/guard/status.guard';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { ClickService } from '../services/click.service';

@Controller('click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: ClickWebhookDto) {
    return this.clickService.handleWebhook(body);
  }

  @Get('url/:order_id')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async getPendingClickUrl(
    @Req() req: Request,
    @Param('order_id') order_id: string,
  ) {
    const auth = req.user as { id: number };
    return this.clickService.getPendingPaymentUrl({
      auth_id: auth.id,
      order_id,
    });
  }
}
