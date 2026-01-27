import { Body, Controller, Post, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { type Response } from "express";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @Post()
    async auth(
        @Body() body: { phone: string; password?: string },
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
    async verifyOtp(
        @Body() body: { phone: string; code: number },
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