import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FindAllModifierGroupFilterDto {
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
    description: "Product ID bo'yicha filter",
    example: 'bbe77443-d36a-4dc4-a8f4-47a9b57e51a9',
  })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional({
    description: "Group nomi bo'yicha qidiruv",
    example: 'Souslar',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
