import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { OrderTypeEnum } from '../enums/order-type.enum';

export class CreateOrderDto {
  order_type: OrderTypeEnum;
  payment_method: OrderPaymentMethodEnum;
}
