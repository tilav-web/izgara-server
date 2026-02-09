import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthStatusEnum } from '../enums/status.enum';
import { AuthRoleEnum } from '../enums/auth-role.enum';

export class UpdateUserAuthDto {
  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    enum: AuthStatusEnum,
    example: AuthStatusEnum.ACTIVE,
  })
  @IsOptional()
  @IsEnum(AuthStatusEnum)
  status?: AuthStatusEnum;

  @ApiPropertyOptional({
    enum: AuthRoleEnum,
    example: AuthRoleEnum.USER,
  })
  @IsOptional()
  @IsEnum(AuthRoleEnum)
  role?: AuthRoleEnum;
}
