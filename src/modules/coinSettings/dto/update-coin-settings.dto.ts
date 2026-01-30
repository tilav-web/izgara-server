import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateCoinSettingsDto {
  @ApiProperty({ 
    example: 500.00, 
    description: "1 ta coin'ning puldagi qiymati. Masalan: 1 coin = 500 so'm chegirma." 
  })
  @IsNumber()
  @Min(0)
  value_per_coin: number;

  @ApiProperty({ 
    example: 10000.00, 
    description: "1 ta coin yig'ish uchun sarflash kerak bo'lgan summa. Masalan: har 10,000 so'mga 1 coin beriladi." 
  })
  @IsNumber()
  @Min(0)
  spend_amount_for_one_coin: number;

  @ApiProperty({ 
    example: 50000.00, 
    description: "Minimal xarid summasi. Buyurtma summasi bundan kam bo'lsa, coin berilmaydi." 
  })
  @IsNumber()
  @Min(0)
  min_spend_limit: number;

  @ApiProperty({ 
    example: 1000, 
    description: "Bitta buyurtma uchun beriladigan maksimal coin miqdori (limit)." 
  })
  @IsNumber()
  @Min(1)
  max_coins_per_order: number;

  @ApiProperty({ 
    example: true, 
    default: true, 
    description: "Coin tizimi yoqilgan yoki o'chirilganligi holati." 
  })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateCoinSettingsDto extends PartialType(CreateCoinSettingsDto) {}