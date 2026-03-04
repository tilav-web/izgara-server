import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';
import { DeliveryAssignmentStatusEnum } from '../enum/delivery-assignment-status.enum';

export class FindAllDeliveryAssignmentsDto {
  @ApiPropertyOptional({
    enum: DeliveryAssignmentStatusEnum,
    example: DeliveryAssignmentStatusEnum.ASSIGNED,
  })
  @IsOptional()
  @Transform(({ value }: { value: DeliveryAssignmentStatusEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(DeliveryAssignmentStatusEnum)
  status?: DeliveryAssignmentStatusEnum;

  @ApiPropertyOptional({
    description: 'Order ID bo‘yicha filter',
    example: 'a0f71f0d-8404-4bf6-9dc5-cf8f7f60a289',
  })
  @IsOptional()
  @IsUUID()
  order_id?: string;

  @ApiPropertyOptional({
    description: 'Delivery user ID bo‘yicha filter',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  delivery_id?: number;

  @ApiPropertyOptional({
    description: 'created_at >= from_date',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    description: 'created_at <= to_date',
    example: '2026-12-31',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;

  @ApiPropertyOptional({ description: 'Sahifa raqami', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sahifadagi yozuvlar soni',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
