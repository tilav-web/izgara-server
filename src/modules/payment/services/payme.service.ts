import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { Order } from '../../order/schemas/order.entity';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { PaymentTransaction } from '../payment-transaction.entity';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { PaymeErrorCodeEnum } from '../enums/payme-error-code.enum';
import { PaymeMethodEnum } from '../enums/payme-method.enum';
import { PaymeTransactionStateEnum } from '../enums/payme-transaction-state.enum';
import {
  CancelTransactionParams,
  CheckPerformParams,
  CreateTransactionParams,
  GetStatementParams,
  JsonRpcId,
  ParsedRpcRequest,
  PaymeErrorResponse,
  PaymeRpcResponse,
  SetFiscalDataParams,
  TransactionIdParams,
} from '../types/payme.types';
import { generatePaymeUrl } from '../../../utils/generate-payme-url';
import { OrderService } from '../../order/services/order.service';
import { OrderGateway } from '../../socket/gateways/order/order.gateway';
import { MeasureEnum } from '../../product/enums/measure.enum';

export interface PaymeFiscalItem {
  title: string; // Mahsulot nomi
  price: number; // Tiyinda (masalan: 500000 = 5000 so'm)
  count: number; // Miqdori
  code: string; // IKPU kodi (17 xonali satr)
  units: number; // O'lchov birligi kodi (masalan: 241092)
  vat_percent: number; // QQS foizi (masalan: 0, 12, 15)
  package_code: string; // Qadoq kodi
  discount?: number; // Ixtiyoriy: Chegirma (tiyinda)
}

@Injectable()
export class PaymeService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly orderService: OrderService,
    private readonly orderGateway: OrderGateway,
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
      url: generatePaymeUrl({
        amount,
        order_id,
      }),
    };
  }

  async handleRequest(body: unknown): Promise<PaymeRpcResponse> {
    const request = this.parseRequest(body);

    if (!request) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid JSON-RPC request',
        null,
      );
    }

    const { method, params, id } = request;

    switch (method) {
      case PaymeMethodEnum.CHECK_PERFORM_TRANSACTION:
        return this.checkPerformTransaction(params, id);
      case PaymeMethodEnum.CREATE_TRANSACTION:
        return this.createTransaction(params, id);
      case PaymeMethodEnum.PERFORM_TRANSACTION:
        return this.performTransaction(params, id);
      case PaymeMethodEnum.CANCEL_TRANSACTION:
        return this.cancelTransaction(params, id);
      case PaymeMethodEnum.CHECK_TRANSACTION:
        return this.checkTransaction(params, id);
      case PaymeMethodEnum.GET_STATEMENT:
        return this.getStatement(params, id);
      case PaymeMethodEnum.SET_FISCAL_DATA:
        return this.setFiscalData(params, id);
      default:
        return this.error(
          PaymeErrorCodeEnum.METHOD_NOT_FOUND,
          'Method not found',
          id,
          method,
        );
    }
  }

  private async checkPerformTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse> {
    const parsed = this.parseCheckPerformParams(params);
    if (!parsed) return this.invalidAccountError(id);

    if (!this.isValidAmount(parsed.amount)) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_AMOUNT,
        'Invalid amount',
        id,
      );
    }

    // 1. Orderni barcha detallari va bog'liqliklari bilan yuklaymiz
    const order = await this.orderRepo.findOne({
      where: { id: parsed.account.order_id },
      relations: {
        items: {
          product: true,
          order_item_modifiers: true, // Modifikatorlar narxini olish uchun shart
        },
      },
    });

    if (!order) return this.invalidAccountError(id);

    // 2. Status tekshiruvlari
    if (order.payment_status === PaymentStatusEnum.SUCCESS) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order already paid',
        id,
      );
    }
    if (order.status === OrderStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order is cancelled',
        id,
      );
    }

    // Summani solishtirish
    const orderAmountInTiyin = this.toTiyin(order.total_price);
    if (orderAmountInTiyin !== parsed.amount) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_AMOUNT,
        'Invalid amount',
        id,
      );
    }

    // 3. Fiskal elementlarni yig'ish
    const fiscalItems: PaymeFiscalItem[] = [];

    for (const item of order.items) {
      // Asosiy mahsulot (masalan: Burger)
      fiscalItems.push({
        title: item.product_name,
        price: this.toTiyin(Number(item.price)),
        count: item.quantity,
        code: item.product?.ikpu_code || '00000000000000000',
        units: this.mapMeasureToPaymeUnits(item.product?.measure_unit), // Shu yerda ishlatdik
        vat_percent: item.product?.vat || 0,
        package_code: item.product?.package_code || '0',
      });

      // PULLIK MODIFIKATORLAR (masalan: Pishloq, Sous)
      if (item.order_item_modifiers && item.order_item_modifiers.length > 0) {
        for (const mod of item.order_item_modifiers) {
          const modPrice = Number(mod.price);

          if (modPrice > 0) {
            fiscalItems.push({
              title: `${item.product_name} (${mod.modifier_name})`, // Mijozga tushunarli bo'lishi uchun
              price: this.toTiyin(modPrice),
              count: mod.quantity,
              // Modifikator IKPUsi o'chirilgani uchun mahsulotnikini ishlatamiz
              code: item.product?.ikpu_code || '00000000000000000',
              units: 241092, // Modifikatorlar har doim dona (PCS)
              vat_percent: item.product?.vat || 0,
              package_code: item.product?.package_code || '0',
            });
          }
        }
      }
    }

    // 4. Yetkazib berish (agar bepul bo'lmasa)
    if (Number(order.delivery_fee) > 0) {
      fiscalItems.push({
        title: 'Yetkazib berish xizmati',
        price: this.toTiyin(Number(order.delivery_fee)),
        count: 1,
        code: '10201001001000000',
        package_code: '1',
        vat_percent: 0,
        units: 241092,
      });
    }

    return {
      result: {
        allow: true,
        detail: {
          receipt_type: 0,
          items: fiscalItems,
        },
      },
      id,
    };
  }

  // O'lchov birliklarini Payme kodlariga o'tkazish (masalan: dona = 241092)
  private mapMeasureToPaymeUnits(measure: MeasureEnum): number {
    switch (measure) {
      case MeasureEnum.PCS:
        return 241092; // Dona
      case MeasureEnum.KG:
        return 166; // Kilogramm
      case MeasureEnum.L:
        return 112; // Litr
      default:
        return 241092; // Agar topilmasa, dona kodi (standart)
    }
  }

  private async createTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<
    PaymeRpcResponse<{
      create_time: number;
      transaction: string;
      state: PaymeTransactionStateEnum;
    }>
  > {
    const parsed = this.parseCreateTransactionParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CreateTransaction params',
        id,
      );
    }

    if (!this.isValidAmount(parsed.amount)) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_AMOUNT,
        'Invalid amount',
        id,
      );
    }

    if (!this.isUuid(parsed.account.order_id)) {
      return this.invalidAccountError(id);
    }

    const order: Order | null = await this.orderRepo.findOneBy({
      id: parsed.account.order_id,
    });

    if (!order) {
      return this.invalidAccountError(id);
    }

    if (order.payment_status === PaymentStatusEnum.SUCCESS) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order already paid',
        id,
      );
    }

    if (order.status === OrderStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order is cancelled',
        id,
      );
    }

    if (order.payment_method !== OrderPaymentMethodEnum.PAYMENT_ONLINE) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order does not support online payments',
        id,
      );
    }

    const orderAmountInTiyin = this.toTiyin(order.total_price);
    if (orderAmountInTiyin !== parsed.amount) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_AMOUNT,
        'Invalid amount',
        id,
      );
    }

    const existing: PaymentTransaction | null =
      await this.transactionRepo.findOneBy({
        provider: PaymentProviderEnum.PAYME,
        provider_transaction_id: parsed.id,
      });

    if (existing) {
      if (existing.order_id !== order.id) {
        return this.invalidAccountError(id);
      }

      const state = this.mapPaymentStatusToPaymeState(existing.status);

      if (state !== PaymeTransactionStateEnum.CREATED) {
        return this.error(
          PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
          'Transaction state invalid',
          id,
        );
      }

      return {
        result: {
          create_time: this.resolvePaymeCreateTime(existing),
          transaction: existing.id,
          state,
        },
        id,
      };
    }

    const existingPending: PaymentTransaction | null =
      await this.transactionRepo.findOneBy({
        provider: PaymentProviderEnum.PAYME,
        order_id: order.id,
        status: PaymentStatusEnum.PENDING,
      });

    if (existingPending) {
      return this.error(
        PaymeErrorCodeEnum.ORDER_HAS_ACTIVE_TRANSACTION,
        'Order has active transaction',
        id,
        'account.order_id',
      );
    }

    const transaction = this.transactionRepo.create({
      order_id: order.id,
      provider: PaymentProviderEnum.PAYME,
      provider_transaction_id: parsed.id,
      provider_create_time: parsed.time,
      amount: this.toSom(parsed.amount),
      status: PaymentStatusEnum.PENDING,
    });

    const saved: PaymentTransaction =
      await this.transactionRepo.save(transaction);

    return {
      result: {
        create_time: this.resolvePaymeCreateTime(saved),
        transaction: saved.id,
        state: PaymeTransactionStateEnum.CREATED,
      },
      id,
    };
  }

  private async performTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<
    PaymeRpcResponse<{
      transaction: string;
      perform_time: number;
      state: PaymeTransactionStateEnum;
    }>
  > {
    const parsed = this.parseTransactionIdParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid PerformTransaction params',
        id,
      );
    }

    const transaction: PaymentTransaction | null =
      await this.transactionRepo.findOne({
        where: {
          provider: PaymentProviderEnum.PAYME,
          provider_transaction_id: parsed.id,
        },
        relations: { order: true },
      });

    if (!transaction) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    if (transaction.status === PaymentStatusEnum.CANCELLED) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Transaction state invalid',
        id,
      );
    }

    const successfulForOrder: PaymentTransaction | null =
      await this.transactionRepo.findOneBy({
        order_id: transaction.order_id,
        status: PaymentStatusEnum.SUCCESS,
      });

    if (successfulForOrder && successfulForOrder.id !== transaction.id) {
      return this.error(
        PaymeErrorCodeEnum.CANNOT_PERFORM_OPERATION,
        'Order already paid',
        id,
      );
    }

    if (transaction.status !== PaymentStatusEnum.SUCCESS) {
      const performTime = Date.now();

      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          PaymentTransaction,
          { id: transaction.id },
          {
            status: PaymentStatusEnum.SUCCESS,
            provider_perform_time: performTime,
          },
        );

        await this.orderService.updatePaymentStatusWithCoinSync(
          transaction.order_id,
          PaymentStatusEnum.SUCCESS,
          manager,
        );
      });

      const updatedOrder = await this.orderRepo.findOne({
        where: { id: transaction.order_id },
        relations: { user: true },
      });
      if (updatedOrder) {
        await this.orderGateway.handleOrder({
          order: updatedOrder,
          user_id: updatedOrder.user_id,
        });
      }

      return {
        result: {
          transaction: transaction.id,
          perform_time: performTime,
          state: PaymeTransactionStateEnum.PERFORMED,
        },
        id,
      };
    }

    const performTime =
      transaction.provider_perform_time != null
        ? Number(transaction.provider_perform_time)
        : transaction.updated_at.getTime();

    return {
      result: {
        transaction: transaction.id,
        perform_time: performTime,
        state: PaymeTransactionStateEnum.PERFORMED,
      },
      id,
    };
  }

  private async cancelTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<
    PaymeRpcResponse<{
      transaction: string;
      cancel_time: number;
      state: PaymeTransactionStateEnum;
    }>
  > {
    const parsed = this.parseCancelTransactionParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CancelTransaction params',
        id,
      );
    }

    const transaction: PaymentTransaction | null =
      await this.transactionRepo.findOne({
        where: {
          provider: PaymentProviderEnum.PAYME,
          provider_transaction_id: parsed.id,
        },
        relations: { order: true },
      });

    if (!transaction) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    const initialState = this.mapPaymentStatusToPaymeState(
      transaction.status,
      transaction.order?.payment_status,
    );
    // Payme expects -2 if the transaction was ever performed, even if order status is already CANCELLED.
    const wasPerformed =
      transaction.provider_perform_time != null ||
      initialState === PaymeTransactionStateEnum.PERFORMED ||
      initialState === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED;
    const cancelledState = wasPerformed
      ? PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
      : PaymeTransactionStateEnum.CANCELLED_FROM_CREATED;
    const cancelReason = this.resolveCancelReasonByState(cancelledState);

    if (transaction.status === PaymentStatusEnum.CANCELLED) {
      let shouldPersist = false;

      if (transaction.provider_cancel_time == null) {
        transaction.provider_cancel_time = transaction.updated_at.getTime();
        shouldPersist = true;
      }

      if (transaction.cancel_reason !== cancelReason) {
        transaction.cancel_reason = cancelReason;
        shouldPersist = true;
      }

      if (shouldPersist) {
        await this.transactionRepo.save(transaction);
      }

      if (
        cancelledState === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
      ) {
        await this.orderService.updatePaymentStatusWithCoinSync(
          transaction.order_id,
          PaymentStatusEnum.CANCELLED,
        );
      }

      return {
        result: {
          transaction: transaction.id,
          cancel_time: this.resolvePaymeCancelTime(transaction),
          state: cancelledState,
        },
        id,
      };
    }

    await this.dataSource.transaction(async (manager) => {
      transaction.status = PaymentStatusEnum.CANCELLED;
      transaction.cancel_reason = cancelReason;
      transaction.provider_cancel_time = Date.now();
      await manager.save(transaction);

      await this.orderService.updatePaymentStatusWithCoinSync(
        transaction.order_id,
        PaymentStatusEnum.CANCELLED,
        manager,
      );
    });

    return {
      result: {
        transaction: transaction.id,
        cancel_time: this.resolvePaymeCancelTime(transaction),
        state: cancelledState,
      },
      id,
    };
  }

  private async checkTransaction(
    params: unknown,
    id: JsonRpcId,
  ): Promise<
    PaymeRpcResponse<{
      create_time: number;
      perform_time: number;
      cancel_time: number;
      transaction: string;
      state: PaymeTransactionStateEnum;
      reason: number | null;
    }>
  > {
    const parsed = this.parseTransactionIdParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid CheckTransaction params',
        id,
      );
    }

    const transaction: PaymentTransaction | null =
      await this.transactionRepo.findOne({
        where: {
          provider: PaymentProviderEnum.PAYME,
          provider_transaction_id: parsed.id,
        },
        relations: { order: true },
      });

    if (!transaction) {
      return this.error(
        PaymeErrorCodeEnum.TRANSACTION_NOT_FOUND,
        'Transaction not found',
        id,
        'id',
      );
    }

    const state = this.mapPaymentStatusToPaymeState(
      transaction.status,
      transaction.order?.payment_status,
    );

    return {
      result: {
        create_time: this.resolvePaymeCreateTime(transaction),
        perform_time: this.resolvePaymePerformTime(transaction, state),
        cancel_time:
          state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED ||
          state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
            ? this.resolvePaymeCancelTime(transaction)
            : 0,
        transaction: transaction.id,
        state,
        reason: this.resolveReasonByState(state),
      },
      id,
    };
  }

  private async getStatement(
    params: unknown,
    id: JsonRpcId,
  ): Promise<PaymeRpcResponse<{ transactions: Record<string, unknown>[] }>> {
    const parsed = this.parseGetStatementParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid GetStatement params',
        id,
      );
    }

    const transactions: PaymentTransaction[] = await this.transactionRepo.find({
      where: {
        provider: PaymentProviderEnum.PAYME,
        created_at: Between(new Date(parsed.from), new Date(parsed.to)),
      },
      order: {
        created_at: 'ASC',
      },
      relations: { order: true },
    });

    return {
      result: {
        transactions: transactions.map((transaction) => {
          const state = this.mapPaymentStatusToPaymeState(
            transaction.status,
            transaction.order?.payment_status,
          );

          return {
            id: transaction.provider_transaction_id,
            time: this.resolvePaymeCreateTime(transaction),
            amount: this.toTiyin(transaction.amount),
            account: {
              order_id: transaction.order_id,
            },
            create_time: this.resolvePaymeCreateTime(transaction),
            perform_time: this.resolvePaymePerformTime(transaction, state),
            cancel_time:
              state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED ||
              state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
                ? this.resolvePaymeCancelTime(transaction)
                : 0,
            transaction: transaction.id,
            state,
            reason: this.resolveReasonByState(state),
          };
        }),
      },
      id,
    };
  }

  private setFiscalData(
    params: unknown,
    id: JsonRpcId,
  ): PaymeRpcResponse<{ success: boolean }> {
    const parsed = this.parseSetFiscalDataParams(params);
    if (!parsed) {
      return this.error(
        PaymeErrorCodeEnum.INVALID_JSON_RPC,
        'Invalid SetFiscalData params',
        id,
      );
    }

    return {
      result: { success: true },
      id,
    };
  }

  private parseRequest(body: unknown): ParsedRpcRequest | null {
    if (!this.isRecord(body)) {
      return null;
    }

    const method = this.getRecordValue(body, 'method');
    const params = this.getRecordValue(body, 'params');
    const requestId = this.getRecordValue(body, 'id');

    if (!this.isPaymeMethod(method)) {
      return null;
    }

    if (!this.isRecord(params)) {
      return null;
    }

    if (!this.isJsonRpcId(requestId) && typeof requestId !== 'undefined') {
      return null;
    }

    return {
      method,
      params,
      id: requestId === undefined ? null : requestId,
    };
  }

  private parseCheckPerformParams(params: unknown): CheckPerformParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const amount = this.getRecordValue(params, 'amount');
    const account = this.getRecordValue(params, 'account');

    if (typeof amount !== 'number') {
      return null;
    }

    if (
      !this.isRecord(account) ||
      typeof this.getRecordValue(account, 'order_id') !== 'string'
    ) {
      return null;
    }

    const orderId = this.getRecordValue(account, 'order_id');
    if (typeof orderId !== 'string') {
      return null;
    }

    return {
      amount,
      account: {
        order_id: orderId,
      },
    };
  }

  private parseCreateTransactionParams(
    params: unknown,
  ): CreateTransactionParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const id = this.getRecordValue(params, 'id');
    const time = this.getRecordValue(params, 'time');
    const amount = this.getRecordValue(params, 'amount');
    const account = this.getRecordValue(params, 'account');
    const orderId = this.isRecord(account)
      ? this.getRecordValue(account, 'order_id')
      : null;

    if (
      typeof id !== 'string' ||
      typeof time !== 'number' ||
      !Number.isInteger(time) ||
      time <= 0 ||
      typeof amount !== 'number' ||
      !this.isRecord(account) ||
      typeof orderId !== 'string'
    ) {
      return null;
    }

    return {
      id,
      time,
      amount,
      account: {
        order_id: orderId,
      },
    };
  }

  private parseTransactionIdParams(
    params: unknown,
  ): TransactionIdParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const id = this.getRecordValue(params, 'id');
    if (typeof id !== 'string') {
      return null;
    }

    return {
      id,
    };
  }

  private parseCancelTransactionParams(
    params: unknown,
  ): CancelTransactionParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const id = this.getRecordValue(params, 'id');
    const reason = this.getRecordValue(params, 'reason');

    if (typeof id !== 'string') {
      return null;
    }

    if (typeof reason !== 'undefined' && typeof reason !== 'number') {
      return null;
    }

    return {
      id,
      reason,
    };
  }

  private parseGetStatementParams(params: unknown): GetStatementParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const from = this.getRecordValue(params, 'from');
    const to = this.getRecordValue(params, 'to');

    if (
      typeof from !== 'number' ||
      typeof to !== 'number' ||
      !Number.isInteger(from) ||
      !Number.isInteger(to) ||
      from > to
    ) {
      return null;
    }

    return {
      from,
      to,
    };
  }

  private parseSetFiscalDataParams(
    params: unknown,
  ): SetFiscalDataParams | null {
    if (!this.isRecord(params)) {
      return null;
    }

    const id = this.getRecordValue(params, 'id');
    const type = this.getRecordValue(params, 'type');
    const fiscalData = this.getRecordValue(params, 'fiscal_data');

    if (
      typeof id !== 'string' ||
      (type !== 'PERFORM' && type !== 'CANCEL') ||
      !this.isRecord(fiscalData)
    ) {
      return null;
    }

    return {
      id,
      type,
      fiscal_data: fiscalData,
    };
  }

  private mapPaymentStatusToPaymeState(
    status: PaymentStatusEnum,
    orderPaymentStatus?: PaymentStatusEnum,
  ): PaymeTransactionStateEnum {
    if (status === PaymentStatusEnum.SUCCESS) {
      return PaymeTransactionStateEnum.PERFORMED;
    }

    if (status === PaymentStatusEnum.CANCELLED) {
      return orderPaymentStatus === PaymentStatusEnum.SUCCESS
        ? PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
        : PaymeTransactionStateEnum.CANCELLED_FROM_CREATED;
    }

    return PaymeTransactionStateEnum.CREATED;
  }

  private invalidAccountError(id: JsonRpcId): PaymeErrorResponse {
    return {
      error: {
        code: PaymeErrorCodeEnum.INVALID_ACCOUNT,
        message: {
          ru: 'Заказ не найден',
          uz: 'Buyurtma topilmadi',
          en: 'Order not found',
        },
        data: 'account.order_id',
      },
      id,
    };
  }

  private error(
    code: number,
    message: string,
    id: JsonRpcId,
    data?: string,
  ): PaymeErrorResponse {
    return {
      error: {
        code,
        message,
        ...(data ? { data } : {}),
      },
      id,
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private getRecordValue(
    record: Record<string, unknown>,
    key: string,
  ): unknown {
    return record[key];
  }

  private isJsonRpcId(value: unknown): value is JsonRpcId {
    return (
      typeof value === 'string' || typeof value === 'number' || value === null
    );
  }

  private isPaymeMethod(value: unknown): value is PaymeMethodEnum {
    return (
      value === PaymeMethodEnum.CHECK_PERFORM_TRANSACTION ||
      value === PaymeMethodEnum.CREATE_TRANSACTION ||
      value === PaymeMethodEnum.PERFORM_TRANSACTION ||
      value === PaymeMethodEnum.CANCEL_TRANSACTION ||
      value === PaymeMethodEnum.CHECK_TRANSACTION ||
      value === PaymeMethodEnum.GET_STATEMENT ||
      value === PaymeMethodEnum.SET_FISCAL_DATA
    );
  }

  private isValidAmount(amount: number): boolean {
    return Number.isInteger(amount) && amount > 0;
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private toSom(amountInTiyin: number): number {
    return amountInTiyin / 100;
  }

  private toTiyin(amountInSom: number): number {
    return Math.round(Number(amountInSom) * 100);
  }

  private resolveReasonByState(
    state: PaymeTransactionStateEnum,
  ): number | null {
    if (state === PaymeTransactionStateEnum.PERFORMED) {
      return null;
    }

    if (
      state === PaymeTransactionStateEnum.CANCELLED_FROM_CREATED ||
      state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
    ) {
      return this.resolveCancelReasonByState(state);
    }

    return null;
  }

  private resolveCancelReasonByState(state: PaymeTransactionStateEnum): number {
    if (state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED) {
      return 5;
    }

    return 3;
  }

  private resolvePaymePerformTime(
    transaction: PaymentTransaction,
    state: PaymeTransactionStateEnum,
  ): number {
    if (
      state === PaymeTransactionStateEnum.PERFORMED ||
      state === PaymeTransactionStateEnum.CANCELLED_FROM_PERFORMED
    ) {
      if (transaction.provider_perform_time != null) {
        return Number(transaction.provider_perform_time);
      }

      return transaction.updated_at.getTime();
    }

    return 0;
  }

  private resolvePaymeCancelTime(transaction: PaymentTransaction): number {
    if (transaction.provider_cancel_time != null) {
      return Number(transaction.provider_cancel_time);
    }

    return transaction.updated_at.getTime();
  }

  private resolvePaymeCreateTime(transaction: PaymentTransaction): number {
    if (transaction.provider_create_time) {
      return Number(transaction.provider_create_time);
    }

    return transaction.created_at.getTime();
  }
}
