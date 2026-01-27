import { Body, Controller, Post, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { type Response } from "express";
import { ApiBody } from "@nestjs/swagger";
import { AuthDto } from "./dto/auth.dto";
import { OtpDto } from "./dto/otp.dto";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @Post()
    @ApiBody({
        type: AuthDto
    })
    async auth(
        @Body() body: AuthDto,
        @Res({ passthrough: true }) res: Response, // cookie yuborish uchun
    ) {
        const { phone, password } = body;

        const result = await this.authService.auth({ phone, password });

        if ('access_token' in result && 'refresh_token' in result) {
            res.cookie('refresh_token', result.refresh_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                sameSite: 'strict',
            });

            return {
                access_token: result.access_token,
                auth: result.auth,
            };
        }

        // Oddiy user uchun
        return {
            message: result.message,
            code: result.code
        };
    }

    @Post('verify-otp')
    @ApiBody({
        type: OtpDto
    })
    async verifyOtp(
        @Body() body: OtpDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { phone, code } = body;
        const result = await this.authService.verifyOtp({ phone, code });

        // Refresh tokenni cookie ga qo‘yish
        res.cookie('refresh_token', result.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            sameSite: 'strict',
        });

        return {
            access_token: result.access_token,
            auth: result.auth,
        };
    }

}