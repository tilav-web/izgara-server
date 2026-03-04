import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateModifierDto {
  @ApiPropertyOptional({ description: 'Modifier nomi', example: 'Ketchup' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Modifier rasmi (URL yoki key)' })
  @IsOptional()
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ description: 'Maksimal tanlash soni', example: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  max_quantity?: number;

  @ApiPropertyOptional({ description: 'Tartib raqami', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Faollik holati', example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;
}
