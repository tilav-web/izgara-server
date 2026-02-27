import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Ichimliklar',
    description: 'Kategoriya nomi',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Saralash tartibi',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sort_order?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: "Kategoriya faol yoki o'chirilgan holati",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  is_active?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary', // 🔑 Swagger-da file ko‘rinishi uchun
    description: 'Kategoriya rasmi',
  })
  @IsOptional()
  image?: Express.Multer.File;
}
