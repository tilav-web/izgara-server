import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Joni',
    description: 'Foydalanuvchi ismi',
  })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Foydalanuvchi Familyasi',
  })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary', // 🔑 Swagger-da file ko‘rinishi uchun
    description: 'Profile rasmi',
  })
  @IsOptional()
  image?: Express.Multer.File;
}
