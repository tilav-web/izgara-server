import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class FindAllModifierFilterDto {
  @ApiPropertyOptional({ description: 'Sahifa raqami', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Sahifadagi yozuvlar soni', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: "Modifier group ID bo'yicha filter",
    example: 'bbe77443-d36a-4dc4-a8f4-47a9b57e51a9',
  })
  @IsOptional()
  @IsUUID()
  group_id?: string;

  @ApiPropertyOptional({
    description: "Product ID bo'yicha filter",
    example: 'bbe77443-d36a-4dc4-a8f4-47a9b57e51a9',
  })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional({
    description: "Modifier nomi bo'yicha qidiruv",
    example: 'Ketchup',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Faqat aktivlar', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;
}
