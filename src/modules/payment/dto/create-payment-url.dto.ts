import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { PaymentProviderEnum } from '../enums/payment-provider.enum';

export class CreatePaymentUrlDto {
  @ApiProperty({ example: '8d0a6c49-7860-4df9-9c9b-f4fb1eaf55c0' })
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  order_id: string;

  @ApiProperty({
    enum: PaymentProviderEnum,
    example: PaymentProviderEnum.CLICK,
  })
  @IsNotEmpty()
  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}
