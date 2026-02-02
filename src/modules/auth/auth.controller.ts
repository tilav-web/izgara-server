import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { type Response } from 'express';
import { AuthDto } from './dto/auth.dto';
import { OtpDto } from './dto/otp.dto';
import { RefreshDto } from './dto/refresh.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async auth(
    @Body() body: AuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { phone, password } = body;
    const result = await this.authService.auth({ phone, password });

    const origin = req.headers['origin'] || '';

    const allowedOrigins =
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

    const isWeb = !!origin && allowedOrigins.includes(origin);

    if ('access_token' in result && 'refresh_token' in result) {
      if (isWeb) {
        // Web: refresh tokenni cookie ga yozish
        res.cookie('refresh_token', result.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        });
        return {
          access_token: result.access_token,
          user: result.user,
        };
      } else {
        // Mobile: refresh tokenni body orqali yuborish
        return {
          access_token: result.access_token,
          refresh_token: result.refresh_token,
          user: result.user,
        };
      }
    }

    // Oddiy user uchun
    return {
      message: result.message,
      code: result.code,
    };
  }

  @Post('/verify-otp')
  async verifyOtp(
    @Body() body: OtpDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    const { phone, code } = body;
    const result = await this.authService.verifyOtp({ phone, code });
    const origin = req.headers['origin'] ?? 'Mavjut emas';
    const allowedOrigins =
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

    const isWeb = !!origin && allowedOrigins.includes(origin);

    if (isWeb) {
      // Web: refresh tokenni cookie ga yozish
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      });
      return {
        access_token: result.access_token,
        user: result.user,
      };
    } else {
      // Mobile: refresh tokenni body orqali yuborish
      return {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user,
      };
    }
  }

  @Post('/refresh-token')
  async refreshToken(
    @Req() req: Request & { cookies: { refresh_token?: string } },
    @Body() body: RefreshDto,
  ) {
    const origin = req.headers['origin'] ?? 'Mavjut emas';
    const allowedOrigins =
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

    const isWeb = !!origin && allowedOrigins.includes(origin);

    if (isWeb) {
      const refresh_token = req.cookies['refresh_token'];
      if (!refresh_token)
        throw new UnauthorizedException('Refresh eskirgan qayta login qiling!');
      const access_token = await this.authService.refreshToken(refresh_token);
      return access_token;
    }

    const refresh_token = body.refresh_token;

    if (!refresh_token)
      throw new UnauthorizedException('Refresh eskirgan qayta login qiling!');
    const access_token = await this.authService.refreshToken(refresh_token);
    return access_token;
  }

  @Post('/logout')
  async logOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.json({ message: 'Tizimdan chiqildi!' });
  }
}
