import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AuthStatusEnum } from '../../auth/enums/status.enum';
import { AuthRoleEnum } from '../../auth/enums/auth-role.enum';
import { Transform, Type } from 'class-transformer';

export class UsersFilterDto {
  @ApiPropertyOptional({
    enum: AuthStatusEnum,
    example: AuthStatusEnum.ACTIVE,
    description: 'Foydalanuvchi statusi',
  })
  @IsOptional()
  @Transform(({ value }: { value: AuthStatusEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(AuthStatusEnum)
  status?: AuthStatusEnum;

  @ApiPropertyOptional({
    enum: AuthRoleEnum,
    example: AuthRoleEnum.USER,
    description: 'Foydalanuvchi roli',
  })
  @IsOptional()
  @Transform(({ value }: { value: AuthRoleEnum | '' }) =>
    value === '' ? undefined : value,
  )
  @IsEnum(AuthRoleEnum)
  role?: AuthRoleEnum;

  @ApiPropertyOptional({
    example: 'Ali',
    description: 'Telefon, ism yoki familiya bo‘yicha qidirish',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'true → coin_balance DESC (max → min), false → ASC (min → max)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  coin_balance?: boolean;

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
}
