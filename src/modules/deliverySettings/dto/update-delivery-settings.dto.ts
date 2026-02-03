import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class UpdateDeliverySettingsDto {
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  delivery_price?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  free_delivery_threshold?: number;
}
