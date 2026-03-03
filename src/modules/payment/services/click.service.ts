import {
  BadRequestException,
  Injectable,
  Logger,
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
  private readonly logger = new Logger(ClickService.name);

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
    try {
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
        this.logger.error(
          'CLICK configuration is incomplete: CLICK_SECRET_KEY or CLICK_SERVICE_ID is missing',
        );
        return this.error(
          ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
          'CONFIGURATION_ERROR',
        );
      }

      if (service_id !== expectedServiceId) {
        this.logger.warn(`CLICK invalid service_id=${service_id}`);
        return this.error(
          ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
          'INVALID_SERVICE_ID',
        );
      }

      if (!this.isClickAction(action)) {
        this.logger.warn(`CLICK invalid action=${action}`);
        return this.error(
          ClickErrorCodeEnum.ACTION_NOT_FOUND,
          'ACTION_NOT_FOUND',
        );
      }

      if (!this.isValidSignTime(sign_time)) {
        return this.error(
          ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
          'INVALID_SIGN_TIME',
        );
      }

      const stringToHash =
        action === ClickActionEnum.PREPARE
          ? `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`
          : `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${merchant_prepare_id ?? ''}${amount}${action}${sign_time}`;

      const mySign = crypto
        .createHash('md5')
        .update(stringToHash)
        .digest('hex');

      if (!this.isSignatureEqual(mySign, sign_string)) {
        this.logger.warn(
          `CLICK sign check failed: trans_id=${click_trans_id}, merchant_trans_id=${merchant_trans_id}`,
        );
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

      return this.handleComplete({
        order_id: order.id,
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id,
        clickErrorCode: this.parseClickErrorCode(error),
      });
    } catch (error) {
      this.logger.error('Unhandled CLICK webhook error', error as Error);
      return this.error(
        ClickErrorCodeEnum.ERROR_IN_REQUEST_FROM_CLICK,
        'INTERNAL_ERROR',
      );
    }
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
    return this.dataSource.transaction(async (manager) => {
      await manager.findOne(Order, {
        where: { id: order.id },
        lock: { mode: 'pessimistic_write' },
      });

      const existingByProviderTx = await manager.findOne(PaymentTransaction, {
        where: {
          provider: PaymentProviderEnum.CLICK,
          provider_transaction_id: click_trans_id,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (existingByProviderTx && existingByProviderTx.order_id !== order.id) {
        return this.error(
          ClickErrorCodeEnum.TRANSACTION_DOES_NOT_EXIST,
          'TRANSACTION_DOES_NOT_EXIST',
        );
      }

      const paymentTransaction =
        existingByProviderTx ??
        (await manager.findOne(PaymentTransaction, {
          where: {
            order_id: order.id,
            provider: PaymentProviderEnum.CLICK,
          },
          order: {
            created_at: 'DESC',
          },
          lock: { mode: 'pessimistic_write' },
        }));

      if (!paymentTransaction) {
        const created = manager.create(PaymentTransaction, {
          order_id: order.id,
          provider: PaymentProviderEnum.CLICK,
          provider_transaction_id: click_trans_id,
          amount: Number(order.total_price),
          status: PaymentStatusEnum.PENDING,
          provider_create_time: Date.now(),
        });
        const saved = await manager.save(PaymentTransaction, created);

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
        await manager.save(PaymentTransaction, paymentTransaction);
      }

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: paymentTransaction.id,
        error: ClickErrorCodeEnum.SUCCESS.toString(),
        error_note: 'SUCCESS',
      };
    });
  }

  private async handleComplete({
    order_id,
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id,
    clickErrorCode,
  }: {
    order_id: string;
    click_trans_id: string;
    merchant_trans_id: string;
    merchant_prepare_id: string;
    clickErrorCode: number;
  }): Promise<ClickWebhookResponse> {
    const result = await this.dataSource.transaction(async (manager) => {
      const paymentTransaction = await manager.findOne(PaymentTransaction, {
        where: {
          id: merchant_prepare_id,
          order_id,
          provider: PaymentProviderEnum.CLICK,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!paymentTransaction) {
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

      const successfulForOrder = await manager.findOne(PaymentTransaction, {
        where: {
          order_id: paymentTransaction.order_id,
          status: PaymentStatusEnum.SUCCESS,
        },
        lock: { mode: 'pessimistic_read' },
      });

      if (
        successfulForOrder &&
        successfulForOrder.id !== paymentTransaction.id
      ) {
        return this.error(ClickErrorCodeEnum.ALREADY_PAID, 'ALREADY_PAID');
      }

      if (clickErrorCode <= -1) {
        paymentTransaction.status = PaymentStatusEnum.CANCELLED;
        paymentTransaction.provider_cancel_time = Date.now();
        await manager.save(PaymentTransaction, paymentTransaction);

        await this.orderService.updatePaymentStatusWithCoinSync(
          paymentTransaction.order_id,
          PaymentStatusEnum.CANCELLED,
          manager,
        );

        return this.error(
          ClickErrorCodeEnum.TRANSACTION_CANCELLED,
          'TRANSACTION_CANCELLED',
        );
      }

      paymentTransaction.status = PaymentStatusEnum.SUCCESS;
      paymentTransaction.provider_transaction_id = click_trans_id;
      paymentTransaction.provider_perform_time = Date.now();
      await manager.save(PaymentTransaction, paymentTransaction);

      await this.orderService.updatePaymentStatusWithCoinSync(
        paymentTransaction.order_id,
        PaymentStatusEnum.SUCCESS,
        manager,
      );

      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: paymentTransaction.id,
        error: ClickErrorCodeEnum.SUCCESS.toString(),
        error_note: 'SUCCESS',
      };
    });

    return result;
  }

  private error(code: ClickErrorCodeEnum, note: string): ClickWebhookResponse {
    return {
      error: code.toString(),
      error_note: note,
    };
  }

  getErrorResponse({
    code,
    note,
  }: {
    code: ClickErrorCodeEnum | number;
    note: string;
  }): ClickWebhookResponse {
    return this.error(code as ClickErrorCodeEnum, note);
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

  private isSignatureEqual(
    expectedSign: string,
    providedSign: string,
  ): boolean {
    const expected = Buffer.from(expectedSign);
    const provided = Buffer.from(providedSign ?? '');

    if (expected.length !== provided.length) {
      return false;
    }

    return crypto.timingSafeEqual(expected, provided);
  }

  private isValidSignTime(sign_time: string): boolean {
    const shouldValidate =
      process.env.CLICK_VALIDATE_SIGN_TIME?.toLowerCase() === 'true';
    if (!shouldValidate) return true;

    if (!sign_time) return false;

    const parsed = Date.parse(sign_time.replace(' ', 'T'));
    if (Number.isNaN(parsed)) {
      this.logger.warn(`CLICK invalid sign_time format: ${sign_time}`);
      return false;
    }

    const maxDriftSeconds = Number(
      process.env.CLICK_SIGN_TIME_MAX_DRIFT_SEC ?? 900,
    );
    const diffMs = Math.abs(Date.now() - parsed);
    if (diffMs > maxDriftSeconds * 1000) {
      this.logger.warn(
        `CLICK sign_time drift exceeded: drift_ms=${diffMs}, max_sec=${maxDriftSeconds}`,
      );
      return false;
    }

    return true;
  }
}
