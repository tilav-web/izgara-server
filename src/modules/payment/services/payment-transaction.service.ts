import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { OrderService } from '../../order/services/order.service';
import { generateClickUrl } from '../../../utils/generate-click-url';
import { generatePaymeUrl } from '../../../utils/generate-payme-url';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';
import { PaymentTransaction } from '../payment-transaction.entity';

@Injectable()
export class PaymentTransactionService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    private readonly orderService: OrderService,
  ) {}

  async createPaymentUrl(auth_id: number, dto: CreatePaymentUrlDto) {
    const order = await this.orderService.findOneMoreOptions({
      auth_id,
      order_id: dto.order_id,
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
        'Bu buyurtma online to`lovga mo`ljallanmagan!',
      );
    }

    const amount = Number(order.total_price);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Buyurtma summasi noto`g`ri!');
    }

    const paymentTransaction = this.paymentTransactionRepository.create({
      order_id: order.id,
      provider: dto.provider,
      amount,
      status: PaymentStatusEnum.PENDING,
    });

    const savedTransaction =
      await this.paymentTransactionRepository.save(paymentTransaction);

    const url = this.makePaymentUrl({
      provider: dto.provider,
      amount,
      transaction_id: savedTransaction.id,
    });

    return {
      url,
    };
  }

  private makePaymentUrl({
    provider,
    amount,
    transaction_id,
  }: {
    provider: PaymentProviderEnum;
    amount: number;
    transaction_id: string;
  }): string {
    switch (provider) {
      case PaymentProviderEnum.CLICK:
        return generateClickUrl({ amount, transaction_id });
      case PaymentProviderEnum.PAYME:
        return generatePaymeUrl({ amount, transaction_id });
      default:
        throw new BadRequestException("Noma'lum to'lov provayderi!");
    }
  }
}
