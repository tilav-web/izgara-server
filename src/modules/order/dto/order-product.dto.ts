import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderModifierDto } from './order-modifier.dto';

export class OrderProductDto {
  @ApiProperty({
    description: 'Mahsulot ID',
    example: 'cdc9c819-af4a-492d-9bda-d732a7dcc691',
  })
  @IsUUID()
  product_id: string;

  @ApiProperty({
    description: 'Mahsulot soni',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

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
