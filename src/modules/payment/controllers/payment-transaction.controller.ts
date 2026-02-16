import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthStatusGuard } from '../../auth/guard/status.guard';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { PaymentTransactionService } from '../services/payment-transaction.service';

@Controller('payment-transactions')
export class PaymentTransactionController {
  constructor(
    private readonly paymentTransactionService: PaymentTransactionService,
  ) {}

  @Post('url')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async createPaymentUrl(
    @Req() req: Request,
    @Body() dto: CreatePaymentUrlDto,
  ) {
    const auth = req.user as { id: number };
    return this.paymentTransactionService.createPaymentUrl(auth.id, dto);
  }
}
