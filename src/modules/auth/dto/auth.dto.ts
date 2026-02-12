import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AuthDto {
  @ApiProperty({
    example: '+998991234567',
    description: 'Telefon raqam kiriting!',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: '12345678',
    description: "Password majburiy emas lekin admin bo'lsangiz majburiy",
    required: false,
  })
  @IsString()
  @IsOptional()
  password?: string;
}
