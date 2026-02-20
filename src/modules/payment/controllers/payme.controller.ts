import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { AuthStatusGuard } from '../../auth/guard/status.guard';
import { PaymeErrorCodeEnum } from '../enums/payme-error-code.enum';
import { PaymeService } from '../services/payme.service';
import { PaymeRpcResponse } from '../types/payme.types';

@Controller('payme')
export class PaymeController {
  private static readonly DEFAULT_PAYME_ALLOWED_IPS = [
    '185.234.113.1',
    '185.234.113.2',
    '185.234.113.3',
    '185.234.113.4',
    '185.234.113.5',
    '185.234.113.6',
    '185.234.113.7',
    '185.234.113.8',
    '185.234.113.9',
    '185.234.113.10',
    '185.234.113.11',
    '185.234.113.12',
    '185.234.113.13',
    '185.234.113.14',
    '185.234.113.15',
  ];

  constructor(private readonly paymeService: PaymeService) {}

  @Post('webhook')
  @HttpCode(200)
  @Header('Content-Type', 'application/json')
  async handlePayme(
    @Body() body: unknown,
    @Headers('authorization') authorization?: string,
    @Req() req?: Request,
  ): Promise<PaymeRpcResponse> {
    if (!this.isAuthorized(authorization) || !this.isAllowedIp(req)) {
      return {
        error: {
          code: PaymeErrorCodeEnum.INSUFFICIENT_PRIVILEGES,
          message: 'Insufficient privileges',
        },
        id: this.extractRpcId(body),
      };
    }

    return this.paymeService.handleRequest(body);
  }

  @Get('url/:order_id')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async getPendingPaymeUrl(
    @Req() req: Request,
    @Param('order_id') order_id: string,
  ) {
    const auth = req.user as { id: number };
    return this.paymeService.getPendingPaymentUrl({
      auth_id: auth.id,
      order_id,
    });
  }

  private isAuthorized(authorization?: string): boolean {
    const secretKey = process.env.PAYME_SECRET_KEY;
    if (!secretKey || !authorization) {
      return false;
    }

    const expected = `Basic ${Buffer.from(`Paycom:${secretKey}`).toString('base64')}`;
    const actualBuffer = Buffer.from(authorization);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  private isAllowedIp(req?: Request): boolean {
    // const ip = this.resolveClientIp(req);
    // if (!ip) {
    //   return false;
    // }

    // return this.getAllowedIps().has(ip);
    return true; // Hozircha IP tekshiruvidan voz kechamiz, keyinchalik yoqish mumkin
  }

  private resolveClientIp(req?: Request): string | null {
    if (!req) {
      return null;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const headerValue = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor;
    const candidateFromHeader = headerValue?.split(',')[0]?.trim();
    const rawIp = candidateFromHeader || req.ip || req.socket?.remoteAddress;

    if (!rawIp) {
      return null;
    }

    return this.normalizeIp(rawIp);
  }

  private normalizeIp(ip: string): string {
    if (ip.startsWith('::ffff:')) {
      return ip.replace('::ffff:', '');
    }

    return ip;
  }

  private getAllowedIps(): Set<string> {
    const envIps = process.env.PAYME_ALLOWED_IPS;
    if (!envIps) {
      return new Set(PaymeController.DEFAULT_PAYME_ALLOWED_IPS);
    }

    const parsed = envIps
      .split(',')
      .map((ip) => this.normalizeIp(ip.trim()))
      .filter(Boolean);

    return new Set(parsed);
  }

  private extractRpcId(body: unknown): number | null {
    if (typeof body !== 'object' || body === null) {
      return null;
    }

    const candidate = (body as { id?: unknown }).id;
    return typeof candidate === 'number' && Number.isInteger(candidate)
      ? candidate
      : null;
  }
}
