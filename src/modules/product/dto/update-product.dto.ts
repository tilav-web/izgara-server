import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { MeasureEnum } from '../enums/measure.enum';

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Mahsulot nomi', example: 'Olma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Mahsulot tavsifi',
    example: 'Qizil olma 1kg',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'QQS stavkasi foizda', example: 15 })
  @IsOptional()
  @IsNumber()
  vat?: number;

  @ApiPropertyOptional({
    enum: MeasureEnum,
    description: "O'lchov birligi",
    example: MeasureEnum.PCS,
  })
  @IsOptional()
  @IsEnum(MeasureEnum)
  measure_unit?: MeasureEnum;

  @ApiPropertyOptional({
    description: "Mahsulot hajmi yoki og'irligi",
    example: 1.5,
  })
  @IsOptional()
  @IsNumber()
  measure?: number;

  @ApiPropertyOptional({
    description: 'Kategoriyasi ichidagi tartib raqami',
    example: 42,
  })
  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @ApiPropertyOptional({ description: 'Mahsulot faolligi', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Kategoriya ID',
    example: 'uuid-of-category',
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Mahsulot rasmi',
  })
  @IsOptional()
  image?: Express.Multer.File;
}
