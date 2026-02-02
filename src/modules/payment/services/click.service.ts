import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PaymentTransaction } from '../payment-transaction.entity';
import { OrderService } from '../../order/services/order.service';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';

@Injectable()
export class ClickService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly orderService: OrderService,
  ) {}

  async handleWebhook(dto: ClickWebhookDto) {
    const {
      click_trans_id,
      merchant_trans_id,
      amount,
      action,
      sign_string,
      error,
      sign_time,
      service_id,
    } = dto;

    const secretKey = process.env.CLICK_SECRET_KEY;

    // 1. Signature (Imzo) tekshirish
    const mySign = crypto
      .createHash('md5')
      .update(
        `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`,
      )
      .digest('hex');

    if (mySign !== sign_string) {
      return { error: '-1', error_note: 'SIGN_CHECK_FAILED' };
    }

    // 2. Buyurtmani bazadan qidirish
    const order = await this.orderService.findById(merchant_trans_id);

    if (!order) {
      return { error: '-5', error_note: 'ORDER_NOT_FOUND' };
    }

    // 3. Summani tekshirish
    if (Number(order.total_price) !== Number(amount)) {
      return { error: '-2', error_note: 'INVALID_AMOUNT' };
    }

    // 4. To'lov allaqachon muvaffaqiyatli yakunlanganini tekshirish (Re-payment prevention)
    const existingTransaction = await this.paymentTransactionRepository.findOne(
      {
        where: {
          provider_transaction_id: click_trans_id,
          status: PaymentStatusEnum.SUCCESS,
        },
      },
    );
    if (existingTransaction && action === '1') {
      return { error: '-4', error_note: 'ALREADY_PAID' }; // Click uchun xato kodi
    }

    // 5. Actionlar bo'yicha ishlash
    if (action === '0') {
      // PREPARE
      // Tranzaksiyani PENDING holatida saqlaymiz
      await this.paymentTransactionRepository.save({
        order_id: merchant_trans_id,
        provider: PaymentProviderEnum.CLICK,
        provider_transaction_id: click_trans_id,
        amount: Number(amount),
        status: PaymentStatusEnum.PENDING,
      });

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: merchant_trans_id,
        error: '0',
        error_note: 'SUCCESS',
      };
    }

    if (action === '1') {
      // COMPLETE
      if (error === '0') {
        // 1. Tranzaksiya holatini SUCCESS ga o'zgartirish
        await this.paymentTransactionRepository.update(
          { provider_transaction_id: click_trans_id },
          { status: PaymentStatusEnum.SUCCESS },
        );

        // 2. Buyurtmani to'langan deb belgilash (Status: PAID) va AliPos'ga yuborish
        await this.orderService.markAsPaid(merchant_trans_id);

        return {
          click_trans_id,
          merchant_trans_id,
          merchant_confirm_id: merchant_trans_id,
          error: '0',
          error_note: 'SUCCESS',
        };
      } else {
        // To'lov bekor qilingan holat
        await this.paymentTransactionRepository.update(
          { provider_transaction_id: click_trans_id },
          { status: PaymentStatusEnum.FAILED },
        );
        return { error: '-9', error_note: 'TRANSACTION_CANCELLED' };
      }
    }

    return { error: '-3', error_note: 'ACTION_NOT_FOUND' };
  }
}
