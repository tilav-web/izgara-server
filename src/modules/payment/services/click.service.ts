import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Order } from '../../order/schemas/order.entity';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { OrderService } from '../../order/services/order.service';
import { ClickWebhookDto } from '../dto/click-webhook.dto';
import { ClickActionEnum } from '../enums/click-action.enum';
import { ClickErrorCodeEnum } from '../enums/click-error-code.enum';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { PaymentTransaction } from '../payment-transaction.entity';
import { ClickWebhookResponse } from '../types/click.types';
import { generateClickUrl } from '../../../utils/generate-click-url';

@Injectable()
export class ClickService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly dataSource: DataSource,
    private readonly orderService: OrderService,
  ) {}

  async getPendingPaymentUrl({
    auth_id,
    order_id,
  }: {
    auth_id: number;
    order_id: string;
  }) {
    const order = await this.orderService.findOneMoreOptions({
      auth_id,
      order_id,
    });
    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi!');
    }

    if (order.payment_status === PaymentStatusEnum.SUCCESS) {
      throw new BadRequestException("Bu buyurtma allaqachon to'langan!");
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      throw new BadRequestException(
        'Bekor qilingan buyurtma uchun to`lov qilib bo`lmaydi!',
      );
    }

    if (order.payment_method !== OrderPaymentMethodEnum.PAYMENT_ONLINE) {
      throw new BadRequestException(
        'Bu buyurtma uchun online to`lov yoqilgan emas!',
      );
    }

    const amount = Number(order.total_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Buyurtma summasi noto`g`ri!');
    }

    return {
      url: generateClickUrl({
        amount,
        order_id,
      }),
    };
  }

  async handleWebhook(dto: ClickWebhookDto): Promise<ClickWebhookResponse> {
    const {
      click_trans_id,
      merchant_trans_id,
      amount,
      action,
      sign_string,
      error,
      sign_time,
      service_id,
      merchant_prepare_id,
    } = dto;

    const secretKey = process.env.CLICK_SECRET_KEY;
    const expectedServiceId = process.env.CLICK_SERVICE_ID;

    if (!secretKey || !expectedServiceId) {
      return this.error(
        ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
        'CONFIGURATION_ERROR',
      );
    }

    if (service_id !== expectedServiceId) {
      return this.error(
        ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
        'INVALID_SERVICE_ID',
      );
    }

    if (!this.isClickAction(action)) {
      return this.error(
        ClickErrorCodeEnum.ACTION_NOT_FOUND,
        'ACTION_NOT_FOUND',
      );
    }

    const stringToHash =
      action === ClickActionEnum.PREPARE
        ? `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`
        : `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${merchant_prepare_id ?? ''}${amount}${action}${sign_time}`;

    const mySign = crypto.createHash('md5').update(stringToHash).digest('hex');

    if (mySign !== sign_string) {
      return this.error(
        ClickErrorCodeEnum.SIGN_CHECK_FAILED,
        'SIGN_CHECK_FAILED',
      );
    }

    const order = await this.orderService.findById(merchant_trans_id);
    if (!order) {
      return this.error(
        ClickErrorCodeEnum.USER_DOES_NOT_EXIST,
        'ORDER_NOT_FOUND',
      );
    }

    const requestAmount = Number(amount);

    if (order.payment_method !== OrderPaymentMethodEnum.PAYMENT_ONLINE) {
      return this.error(
        ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
        'ORDER_PAYMENT_METHOD_INVALID',
      );
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_CANCELLED,
        'ORDER_CANCELLED',
      );
    }

    if (order.payment_status === PaymentStatusEnum.SUCCESS) {
      return this.error(ClickErrorCodeEnum.ALREADY_PAID, 'ALREADY_PAID');
    }

    if (!this.isAmountEqual(Number(order.total_price), requestAmount)) {
      return this.error(ClickErrorCodeEnum.INVALID_AMOUNT, 'INVALID_AMOUNT');
    }

    if (action === ClickActionEnum.PREPARE) {
      return this.handlePrepare({
        order,
        click_trans_id,
        merchant_trans_id,
      });
    }

    if (!merchant_prepare_id) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_DOES_NOT_EXIST,
        'TRANSACTION_DOES_NOT_EXIST',
      );
    }

    const paymentTransaction =
      await this.paymentTransactionRepository.findOneBy({
        id: merchant_prepare_id,
        order_id: order.id,
        provider: PaymentProviderEnum.CLICK,
      });

    if (!paymentTransaction) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_DOES_NOT_EXIST,
        'TRANSACTION_DOES_NOT_EXIST',
      );
    }

    return this.handleComplete({
      paymentTransaction,
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id,
      clickErrorCode: this.parseClickErrorCode(error),
    });
  }

  private async handlePrepare({
    order,
    click_trans_id,
    merchant_trans_id,
  }: {
    order: Order;
    click_trans_id: string;
    merchant_trans_id: string;
  }): Promise<ClickWebhookResponse> {
    const existingByProviderTx =
      await this.paymentTransactionRepository.findOneBy({
        provider: PaymentProviderEnum.CLICK,
        provider_transaction_id: click_trans_id,
      });

    if (existingByProviderTx && existingByProviderTx.order_id !== order.id) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_DOES_NOT_EXIST,
        'TRANSACTION_DOES_NOT_EXIST',
      );
    }

    const paymentTransaction =
      existingByProviderTx ??
      (await this.paymentTransactionRepository.findOne({
        where: {
          order_id: order.id,
          provider: PaymentProviderEnum.CLICK,
        },
        order: {
          created_at: 'DESC',
        },
      }));

    if (!paymentTransaction) {
      const created = this.paymentTransactionRepository.create({
        order_id: order.id,
        provider: PaymentProviderEnum.CLICK,
        provider_transaction_id: click_trans_id,
        amount: Number(order.total_price),
        status: PaymentStatusEnum.PENDING,
      });
      const saved = await this.paymentTransactionRepository.save(created);

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: saved.id,
        error: ClickErrorCodeEnum.SUCCESS.toString(),
        error_note: 'SUCCESS',
      };
    }

    if (paymentTransaction.status === PaymentStatusEnum.SUCCESS) {
      return this.error(ClickErrorCodeEnum.ALREADY_PAID, 'ALREADY_PAID');
    }

    if (paymentTransaction.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_CANCELLED,
        'TRANSACTION_CANCELLED',
      );
    }

    if (paymentTransaction.provider_transaction_id !== click_trans_id) {
      paymentTransaction.provider_transaction_id = click_trans_id;
      await this.paymentTransactionRepository.save(paymentTransaction);
    }

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: paymentTransaction.id,
      error: ClickErrorCodeEnum.SUCCESS.toString(),
      error_note: 'SUCCESS',
    };
  }

  private async handleComplete({
    paymentTransaction,
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id,
    clickErrorCode,
  }: {
    paymentTransaction: PaymentTransaction;
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id?: string;
    clickErrorCode: number;
  }): Promise<ClickWebhookResponse> {
    if (!merchant_prepare_id || merchant_prepare_id !== paymentTransaction.id) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_DOES_NOT_EXIST,
        'TRANSACTION_DOES_NOT_EXIST',
      );
    }

    if (paymentTransaction.status === PaymentStatusEnum.SUCCESS) {
      return this.error(ClickErrorCodeEnum.ALREADY_PAID, 'ALREADY_PAID');
    }

    if (paymentTransaction.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        ClickErrorCodeEnum.TRANSACTION_CANCELLED,
        'TRANSACTION_CANCELLED',
      );
    }

    const successfulForOrder =
      await this.paymentTransactionRepository.findOneBy({
        order_id: paymentTransaction.order_id,
        status: PaymentStatusEnum.SUCCESS,
      });

    if (successfulForOrder && successfulForOrder.id !== paymentTransaction.id) {
      return this.error(ClickErrorCodeEnum.ALREADY_PAID, 'ALREADY_PAID');
    }

    if (clickErrorCode <= -1) {
      await this.paymentTransactionRepository.update(paymentTransaction.id, {
        status: PaymentStatusEnum.CANCELLED,
      });

      return this.error(
        ClickErrorCodeEnum.TRANSACTION_CANCELLED,
        'TRANSACTION_CANCELLED',
      );
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          PaymentTransaction,
          { id: paymentTransaction.id },
          {
            status: PaymentStatusEnum.SUCCESS,
            provider_transaction_id: click_trans_id,
          },
        );

        await manager.update(
          Order,
          { id: paymentTransaction.order_id },
          { payment_status: PaymentStatusEnum.SUCCESS },
        );
      });
    } catch {
      return this.error(
        ClickErrorCodeEnum.FAILED_TO_UPDATE_USER,
        'FAILED_TO_UPDATE_ORDER',
      );
    }

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: paymentTransaction.id,
      error: ClickErrorCodeEnum.SUCCESS.toString(),
      error_note: 'SUCCESS',
    };
  }

  private error(code: ClickErrorCodeEnum, note: string): ClickWebhookResponse {
    return {
      error: code.toString(),
      error_note: note,
    };
  }

  private isClickAction(value: unknown): value is ClickActionEnum {
    return (
      typeof value === 'string' &&
      Object.values(ClickActionEnum).includes(value as ClickActionEnum)
    );
  }

  private isAmountEqual(orderAmount: number, requestAmount: number): boolean {
    return Math.abs(orderAmount - requestAmount) < 0.01;
  }

  private parseClickErrorCode(value: string): number {
    const parsed = Number(value);
    return Number.isNaN(parsed)
      ? ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK
      : parsed;
  }
}
