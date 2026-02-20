import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderPaymentMethodEnum } from '../../order/enums/order-payment-status.enum';
import { OrderStatusEnum } from '../../order/enums/order-status.enum';
import { OrderService } from '../../order/services/order.service';
import { generateClickUrl } from '../../../utils/generate-click-url';
import { generatePaymeUrl } from '../../../utils/generate-payme-url';
import { CreatePaymentUrlDto } from '../dto/create-payment-url.dto';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';
import { PaymentStatusEnum } from '../enums/payment-status.enum';

@Injectable()
export class PaymentTransactionService {
  constructor(private readonly orderService: OrderService) {}

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

    const url = this.makePaymentUrl({
      provider: dto.provider,
      amount,
      order_id: order.id,
    });

    return {
      url,
    };
  }

  private makePaymentUrl({
    provider,
    amount,
    order_id,
  }: {
    provider: PaymentProviderEnum;
    amount: number;
    order_id: string;
  }): string {
    switch (provider) {
      case PaymentProviderEnum.CLICK:
        return generateClickUrl({ amount, order_id });
      case PaymentProviderEnum.PAYME:
        return generatePaymeUrl({ amount, order_id });
      default:
        throw new BadRequestException("Noma'lum to'lov provayderi!");
    }
  }
}
