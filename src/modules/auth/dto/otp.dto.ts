import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class OtpDto {
    @ApiProperty({
        example: "+998991234567",
        description: "Telefon raqam kiriting!"
    })
    @IsNotEmpty()
    phone: string

    @ApiProperty({
        example: 4444,
        description: "1 martalik kod 1 daqiqa amal qiladi va so'ng yangisini olish uchun so'rov yuborishingiz kerak!"
    })
    @IsNumber()
    @IsNotEmpty()
    code: number
}