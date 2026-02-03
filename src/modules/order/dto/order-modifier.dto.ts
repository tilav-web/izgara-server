import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsUUID, Min } from 'class-validator';

export class OrderModifierDto {
  @ApiProperty({
    description: 'Modifier ID',
    example: 'cdc9c819-af4a-492d-9bda-d732a7dcc691',
  })
  @IsUUID()
  modifier_id: string;

  @ApiProperty({
    description: 'Mahsulot soni',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
