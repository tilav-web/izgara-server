import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

import { OrderStatusEnum } from '../enums/order-status.enum';
import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { PaymentStatusEnum } from '../../payment/enums/payment-status.enum';
import { OrderTypeEnum } from '../enums/order-type.enum';
import { SortOrderEnum } from '../../../enums/sort-order.enum';

export class FilterOrderDto {
  @ApiPropertyOptional({ example: 12, description: 'User ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  user_id?: number;

  @ApiPropertyOptional({ example: '#542' })
  @IsOptional()
  @IsString()
  order_number?: string;

  @ApiPropertyOptional({
    enum: OrderStatusEnum,
    example: OrderStatusEnum.NEW,
  })
  @IsOptional()
  @Transform(({ value }: { value: OrderStatusEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

  @ApiPropertyOptional({
    enum: OrderTypeEnum,
    example: OrderTypeEnum.DELIVERY,
  })
  @IsOptional()
  @Transform(({ value }: { value: OrderTypeEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(OrderTypeEnum)
  order_type?: OrderTypeEnum;

  @ApiPropertyOptional({
    enum: OrderPaymentMethodEnum,
    example: OrderPaymentMethodEnum.PAYMENT_CASH,
  })
  @IsOptional()
  @Transform(({ value }: { value: OrderPaymentMethodEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(OrderPaymentMethodEnum)
  payment_method?: OrderPaymentMethodEnum;

  @ApiPropertyOptional({
    enum: PaymentStatusEnum,
    example: PaymentStatusEnum.SUCCESS,
  })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  @Transform(({ value }: { value: PaymentStatusEnum | '' }) =>
    value === '' ? undefined : value,
  )
  payment_status?: PaymentStatusEnum;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  customer_phone?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_total_price?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  max_total_price?: number;

  // ===== DATE FILTER =====

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'created_at >= from_date',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'created_at <= to_date',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  // ===== PAGINATION =====

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  // ===== SORT =====
  @ApiPropertyOptional({
    example: SortOrderEnum.DESC,
    description: 'Sort order',
    enum: SortOrderEnum,
  })
  @IsOptional()
  @Transform(({ value }: { value: SortOrderEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(SortOrderEnum)
  sort_order?: SortOrderEnum = SortOrderEnum.DESC;
}
