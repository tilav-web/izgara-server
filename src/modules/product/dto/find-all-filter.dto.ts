import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllFilterDto {
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

  @ApiPropertyOptional({ description: 'Kategoriya ID bo‘yicha filter', example: 'bbe77443-d36a-4dc4-a8f4-47a9b57e51a9' })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({ description: 'Minimal narx', example: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price_min?: number;

  @ApiPropertyOptional({ description: 'Maksimal narx', example: 50000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price_max?: number;
}
