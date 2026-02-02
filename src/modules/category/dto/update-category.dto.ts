import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

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
  @IsInt()
  sort_order?: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary', // 🔑 Swagger-da file ko‘rinishi uchun
    description: 'Kategoriya rasmi',
  })
  @IsOptional()
  image?: Express.Multer.File;
}
