import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class OtpDto {
  @ApiProperty({
    example: '+998991234567',
    description: 'Telefon raqam kiriting!',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    example: 4444,
    description:
      "1 martalik kod 1 daqiqa amal qiladi va so'ng yangisini olish uchun so'rov yuborishingiz kerak!",
  })
  @IsNumber()
  @IsNotEmpty()
  code: number;
}
