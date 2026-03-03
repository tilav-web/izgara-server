import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { ClickService } from '../services/click.service';
import type { Request } from 'express';

@Controller('click')
export class ClickController {
  private static readonly DEFAULT_CLICK_ALLOWED_IPS = ['91.204.239.42'];
  private readonly logger = new Logger(ClickController.name);

  constructor(private readonly clickService: ClickService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: ClickWebhookDto, @Req() req: Request) {
    const ip = this.resolveClientIp(req);

    if (!ip || !this.getAllowedIps().has(ip)) {
      this.logger.warn(
        `Blocked CLICK webhook from unauthorized ip=${ip ?? 'unknown'}`,
      );

      return this.clickService.getErrorResponse({
        code: -8,
        note: 'IP_NOT_ALLOWED',
      });
    }

    return this.clickService.handleWebhook(body);
  }

  private resolveClientIp(req?: Request): string | null {
    if (!req) return null;

    const forwardedFor = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const candidateFromHeader = headerValue?.split(',')[0]?.trim();
    const rawIp = candidateFromHeader || req.ip || req.socket?.remoteAddress;
    if (!rawIp) return null;

    return this.normalizeIp(rawIp);
  }

  private normalizeIp(ip: string): string {
    if (ip.startsWith('::ffff:')) {
      return ip.replace('::ffff:', '');
    }
    return ip;
  }

  private getAllowedIps(): Set<string> {
    const envIps = process.env.CLICK_ALLOWED_IPS;
    if (!envIps) {
      return new Set(ClickController.DEFAULT_CLICK_ALLOWED_IPS);
    }

    const parsed = envIps
      .split(',')
      .map((ip) => this.normalizeIp(ip.trim()))
      .filter(Boolean);

    return new Set(parsed);
  }
}
