import { Controller, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    if (!this.botService.webhookCallback) {
      return res.status(500).send('Webhook callback is not initialized');
    }

    await this.botService.webhookCallback(req, res);
  }
}
