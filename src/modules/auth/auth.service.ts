import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Auth } from './auth.entity';
import { Repository } from 'typeorm';
import { otpCodeGenerate } from './utils/otp-code.generate';
import { regexPhone } from './utils/regex-phone';
import { OtpRedisService } from '../redis/otp-redis.service';
import { AuthRedisService } from '../redis/auth-redis.service';
import { JwtService } from '@nestjs/jwt';
import { AuthRoleEnum } from './enums/auth-role.enum';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { UserRedisService } from '../redis/user-redis.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth) private readonly repository: Repository<Auth>,
    private readonly otpRedisService: OtpRedisService,
    private readonly userRedisService: UserRedisService,
    private readonly authRedisService: AuthRedisService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async findById(id: number): Promise<Auth | null> {
    const authCache = await this.authRedisService.getAuthDetails({ id });
    if (authCache) {
      return authCache;
    }
    const authNotFoundCache = await this.authRedisService.getNotFoundAuth({
      id,
    });
    if (authNotFoundCache) {
      return null;
    }
    const auth = await this.repository.findOne({ where: { id } });
    if (!auth) {
      await this.authRedisService.setNotFoundAuth({ id });
      return null;
    }

    this.authRedisService.setAuthDetails({ auth });
    return auth;
  }

  async findByPhone(phone: string): Promise<Auth | null> {
    const { test, cleanPhone } = regexPhone(phone);

    if (!test) {
      throw new BadRequestException(
        'Telefon raqami O‘zbekiston formatida emas',
      );
    }

    const authCache = await this.authRedisService.getAuthDetails({
      phone: cleanPhone,
    });
    if (authCache) {
      return authCache;
    }
    const authNotFoundCache = await this.authRedisService.getNotFoundAuth({
      phone: cleanPhone,
    });
    if (authNotFoundCache) {
      return null;
    }
    const auth = await this.repository.findOne({
      where: { phone: cleanPhone },
    });
    if (!auth) {
      await this.authRedisService.setNotFoundAuth({ phone: cleanPhone });
      return null;
    }

    this.authRedisService.setAuthDetails({ auth });
    return auth;
  }

  async auth({ phone, password }: { phone: string; password?: string }) {
    const { test, cleanPhone } = regexPhone(phone);

    if (!test) {
      throw new BadRequestException(
        'Telefon raqami O‘zbekiston formatida emas',
      );
    }

    const auth = await this.findByPhone(cleanPhone);

    if (auth?.role === AuthRoleEnum.SUPERADMIN) {
      if (!password || !auth.password) {
        throw new BadRequestException(
          'Parol kiritilmagan. Admin sifatida kirish uchun parolingizni kiriting yoki supportga murojaat qiling',
        );
      }

      const isMatch = await bcrypt.compare(password, auth.password);

      if (!isMatch) throw new BadRequestException('Parolda xatolik bor!');

      const access_token = this.jwtService.sign(
        {
          id: auth.id,
          role: auth.role,
        },
        {
          expiresIn: '15m',
        },
      );

      const refresh_token = this.jwtService.sign(
        {
          id: auth.id,
          role: auth.role,
        },
        {
          expiresIn: '7d',
        },
      );
      const user = await this.userService.findByAuthId(auth.id);
      return {
        access_token,
        refresh_token,
        user,
      };
    }

    const hasCode = await this.otpRedisService.getOtpByPhone(cleanPhone);

    if (hasCode) {
      throw new ConflictException(
        'Oldingi OTP hali amal qiladi. Iltimos, bir necha soniya kuting yoki eski kodni ishlating.',
      );
    }

    const code = otpCodeGenerate();

    await this.otpRedisService.setOtpByPhone({ phone: cleanPhone, code });
    return {
      message:
        'Telefon raqamingizga 4 xonali kod yubirdik amal qilish muddati 1 daqiqa!',
      code,
    }; // o'chirish kerak keyinchalik kodni
  }

  async verifyOtp({ phone, code }: { phone: string; code: number }) {
    const { test, cleanPhone } = regexPhone(phone);

    if (!test) {
      throw new BadRequestException(
        'Telefon raqami O‘zbekiston formatida emas',
      );
    }

    const verifyOtpResult = await this.otpRedisService.verifyOtpByPhone({
      phone: cleanPhone,
      code,
    });

    if (verifyOtpResult === 0) {
      throw new BadRequestException('Kodni tekshiring va qayta kiriting');
    }

    if (verifyOtpResult === 2) {
      throw new BadRequestException('Kodning amal qilish muddati tugadi!');
    }

    let auth = await this.findByPhone(phone);

    if (!auth) {
      const user = await this.userService.create({ phone: cleanPhone });
      auth = this.repository.create({ phone: cleanPhone, user });
      await this.repository.save(auth);
      await this.userRedisService.setUserDetails({ user, auth_id: auth.id });
    }

    const access_token = this.jwtService.sign(
      {
        id: auth.id,
        role: auth.role,
      },
      {
        expiresIn: '15m',
      },
    );

    const refresh_token = this.jwtService.sign(
      {
        id: auth.id,
        role: auth.role,
      },
      {
        expiresIn: '7d',
      },
    );
    const user = await this.userService.findByAuthId(auth.id);

    return { access_token, refresh_token, user };
  }

  async refreshToken(refresh_token: string) {
    const payload = await this.jwtService.verifyAsync<{
      id: number;
      role: AuthRoleEnum;
    }>(refresh_token);

    const access_token = this.jwtService.sign({
      id: payload.id,
      role: payload.role,
    });

    return { access_token };
  }
}
