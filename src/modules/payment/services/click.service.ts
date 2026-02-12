import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { PaymentTransaction } from '../payment-transaction.entity';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { Order } from '../../order/schemas/order.entity';
import { OrderService } from '../../order/services/order.service';

@Injectable()
export class ClickService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderService: OrderService,
  ) {}

  async handleWebhook(dto: ClickWebhookDto) {
    const {
      click_trans_id,
      merchant_trans_id, // Bu biz yuborgan PaymentTransaction.id
      amount,
      action,
      sign_string,
      error,
      sign_time,
      service_id,
      merchant_prepare_id,
    } = dto;

    const secretKey = process.env.CLICK_SECRET_KEY;

    const stringToHash =
      action.toString() === '0'
        ? `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`
        : `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${merchant_prepare_id}${amount}${action}${sign_time}`;

    const mySign = crypto.createHash('md5').update(stringToHash).digest('hex');

    if (mySign !== sign_string) {
      return { error: '-1', error_note: 'SIGN_CHECK_FAILED' };
    }

    // 2. Tranzaksiyani bazadan qidirish (Relation orqali orderni ham olamiz)
    const paymentTransaction = await this.paymentTransactionRepository.findOne({
      where: { id: merchant_trans_id },
      relations: { order: true },
    });

    if (!paymentTransaction) {
      return { error: '-5', error_note: 'TRANSACTION_NOT_FOUND' };
    }

    const order = paymentTransaction.order;

    // 3. Summani tekshirish (Haqiqiy total_price bilan Click'dan kelganini solishtirish)
    if (Number(order.total_price) !== Number(amount)) {
      return { error: '-2', error_note: 'INVALID_AMOUNT' };
    }

    // 4. PREPARE (action = 0)
    if (action === '0') {
      // Agar tranzaksiya allaqachon muvaffaqiyatli bo'lgan bo'lsa
      if (paymentTransaction.status === PaymentStatusEnum.SUCCESS) {
        return { error: '-4', error_note: 'ALREADY_PAID' };
      }

      // Click tranzaksiya ID sini saqlab qo'yamiz (keyinchalik solishtirish uchun)
      paymentTransaction.provider_transaction_id = click_trans_id.toString();
      await this.paymentTransactionRepository.save(paymentTransaction);

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: paymentTransaction.id.toString(),
        error: '0',
        error_note: 'SUCCESS',
      };
    }

    // 5. COMPLETE (action = 1)
    if (action === '1') {
      // Xatolik bo'lsa
      if (error !== '0') {
        await this.paymentTransactionRepository.update(paymentTransaction.id, {
          status: PaymentStatusEnum.FAILED,
        });
        return { error: '-9', error_note: 'TRANSACTION_CANCELLED' };
      }

      // To'lov muvaffaqiyatli bo'lsa
      if (paymentTransaction.status !== PaymentStatusEnum.SUCCESS) {
        // a) Tranzaksiyani yangilash
        await this.paymentTransactionRepository.update(paymentTransaction.id, {
          status: PaymentStatusEnum.SUCCESS,
          provider_transaction_id: click_trans_id.toString(),
        });

        // b) Orderni yangilash va AliPos/Queue mantiqlarini ishga tushirish
        // Bu yerda payment_id emas, order_id ni uzatayotganingizga e'tibor bering!
        await this.orderService.markAsPaid(order.id);
      }

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: paymentTransaction.id.toString(),
        error: '0',
        error_note: 'SUCCESS',
      };
    }

    return { error: '-3', error_note: 'ACTION_NOT_FOUND' };
  }
}
