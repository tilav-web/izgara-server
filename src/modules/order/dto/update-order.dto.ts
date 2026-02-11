import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { OrderStatusEnum } from '../enums/order-status.enum';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatusEnum })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

  @ApiPropertyOptional({ enum: PaymentStatusEnum })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  payment_status?: PaymentStatusEnum;
}
