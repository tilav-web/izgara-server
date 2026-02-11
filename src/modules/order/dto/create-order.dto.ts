import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { OrderPaymentMethodEnum } from '../enums/order-payment-status.enum';
import { OrderTypeEnum } from '../enums/order-type.enum';
import { OrderProductDto } from './order-product.dto';
import { OrderModifierDto } from './order-modifier.dto';
import { PaymentProviderEnum } from '../../payment/enums/payment-provider.enum';

export class CreateOrderDto {
  @ApiProperty({
    enum: OrderTypeEnum,
    example: OrderTypeEnum.DELIVERY,
  })
  @IsEnum(OrderTypeEnum)
  order_type: OrderTypeEnum;

  @ApiProperty({
    enum: PaymentProviderEnum,
    example: PaymentProviderEnum.CLICK,
  })
  @IsEnum(PaymentProviderEnum)
  payment_provider?: PaymentProviderEnum;

  @ApiProperty({
    enum: OrderPaymentMethodEnum,
    example: OrderPaymentMethodEnum.PAYMENT_CASH,
  })
  @IsEnum(OrderPaymentMethodEnum)
  payment_method: OrderPaymentMethodEnum;

  @ApiProperty({
    description: 'Yetkazib berish manzili',
    example: 'Toshkent sh, Chilonzor',
  })
  @IsString()
  address: string;

  @ApiPropertyOptional({
    description: 'Filial ID (pickup uchun)',
    example: 'cdc9c819-af4a-492d-9bda-d732a7dcc691',
  })
  @IsOptional()
  @IsUUID()
  @Transform(({ value }: { value: string }) =>
    value === '' ? undefined : value,
  )
  location_id?: string;

  // --- products ---
  @ApiProperty({
    type: [OrderProductDto],
    description: 'Buyurtmadagi mahsulotlar',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  products: OrderProductDto[];

  // --- modifiers ---
  @ApiPropertyOptional({
    type: [OrderModifierDto],
    description: 'Tanlangan modifierlar',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderModifierDto)
  modifiers?: OrderModifierDto[];
}
