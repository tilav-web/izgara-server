import {
  Body,
  Controller,
  Header,
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
  private readonly logger = new Logger(ClickController.name);

  constructor(private readonly clickService: ClickService) {}

  @Post('prepare')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async prepare(@Body() body: ClickWebhookDto, @Req() req: Request) {
    if (!this.isAllowedIp(req)) {
      return this.blockByIp(req);
    }
    return this.clickService.prepare(body);
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  async complete(@Body() body: ClickWebhookDto, @Req() req: Request) {
    if (!this.isAllowedIp(req)) {
      return this.blockByIp(req);
    }
    return this.clickService.complete(body);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: ClickWebhookDto, @Req() req: Request) {
    if (!this.isAllowedIp(req)) {
      return this.blockByIp(req);
    }

    return this.clickService.handleWebhook(body);
  }

  private isAllowedIp(req?: Request): boolean {
    const ip = this.resolveClientIp(req);
    const allowedIps = this.getAllowedIps();

    if (allowedIps === null) {
      this.logger.warn(
        'CLICK_ALLOWED_IPS is not configured — all IPs are allowed. Set CLICK_ALLOWED_IPS in .env for production!',
      );
      return true;
    }

    if (!ip) return false;
    return allowedIps.has(ip);
  }

  private blockByIp(req?: Request) {
    const ip = this.resolveClientIp(req);
    this.logger.warn(
      `Blocked CLICK webhook from unauthorized ip=${ip ?? 'unknown'}`,
    );

    return this.clickService.getErrorResponse({
      code: -8,
      note: 'IP_NOT_ALLOWED',
    });
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

  private getAllowedIps(): Set<string> | null {
    const envIps = process.env.CLICK_ALLOWED_IPS;
    if (!envIps || envIps.trim() === '') {
      return null;
    }

    const parsed = envIps
      .split(',')
      .map((ip) => this.normalizeIp(ip.trim()))
      .filter(Boolean);

    if (parsed.length === 0) {
      return null;
    }

    return new Set(parsed);
  }
}
