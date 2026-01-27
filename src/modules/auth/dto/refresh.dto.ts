import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class RefreshDto {
    @ApiProperty({
        example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6IlNVUEVSQURNSU4iLCJpYXQiOjE3Njk1MTA1MTAsImV4cCI6MTc2OTUxMTQxMH0.K0qzxDv8Y6mEDXb-hib51pV0BSPOZhLAzM3QKVuNnYw",
        description: "Mobile refresh token ni body da yuboradi va access_token ni yangilaydi client withCredentials: true qilib so'rov yuborganda refresh cookie da keladi",
        required: false
    })
    @IsOptional()
    refresh_token?: string
}