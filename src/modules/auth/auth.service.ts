import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { UpdateUserAuthDto } from './dto/update-user-auth.dto';
import { AuthStatusEnum } from './enums/status.enum';
import { User } from '../user/user.entity';
import { JwtTypeEnum } from './enums/jwt-type.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Auth) private readonly repository: Repository<Auth>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly otpRedisService: OtpRedisService,
    private readonly userRedisService: UserRedisService,
    private readonly authRedisService: AuthRedisService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  private generateJwt({ id, role }: { id: number; role: AuthRoleEnum }) {
    const access_token = this.jwtService.sign(
      {
        id,
        role,
        type: JwtTypeEnum.ACCESS,
      },
      {
        expiresIn: '15m',
      },
    );

    const refresh_token = this.jwtService.sign(
      {
        id,
        role,
        type: JwtTypeEnum.REFRESH,
      },
      {
        expiresIn: '7d',
      },
    );

    return { access_token, refresh_token };
  }

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

    await this.authRedisService.setAuthDetails({ auth });
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

    await this.authRedisService.setAuthDetails({ auth });
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

      const { refresh_token, access_token } = this.generateJwt({
        id: auth.id,
        role: auth.role,
      });

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

    const { refresh_token, access_token } = this.generateJwt({
      id: auth.id,
      role: auth.role,
    });
    const user = await this.userService.findByAuthId(auth.id);

    return { access_token, refresh_token, user };
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync<{
      id: number;
      role: AuthRoleEnum;
      type: JwtTypeEnum;
    }>(refreshToken);

    const auth = await this.findById(payload.id);

    if (!auth)
      throw new NotFoundException('Foydalanuvchi malumotlari topilmadi!');

    if (auth.status === AuthStatusEnum.BLOCK)
      throw new BadRequestException(
        'Foydalanuvchi bloklangan adminga aloqaga chiqing!',
      );

    if (payload.type !== JwtTypeEnum.REFRESH)
      throw new BadRequestException('REFRESH_TOKEN-da xatolik bor');

    const { refresh_token, access_token } = this.generateJwt({
      id: auth.id,
      role: auth.role,
    });

    return { access_token, refresh_token };
  }

  async updateForAdmin({
    auth_id,
    user_id,
    first_name,
    last_name,
    status,
    role,
  }: {
    auth_id: number; // admin auth id
    user_id: number; // user id
  } & UpdateUserAuthDto) {
    if (!user_id)
      throw new NotFoundException('Foydalanuvhci id sini yuboring!');

    const superAdminAuth = await this.findById(auth_id);

    if (!superAdminAuth)
      throw new NotFoundException('Admin malumotlari topilmadi!');

    const userAuth = await this.repository.findOne({
      where: {
        user_id,
      },
    });

    if (!userAuth)
      throw new NotFoundException('Foydalanuvchi malumotlari topilmadi!');

    const user = await this.userRepository.findOne({
      where: {
        id: user_id,
      },
    });

    if (!user)
      throw new NotFoundException('Foydalanuvchi malumotlari topilmadi!');

    const superAdminPhone = process.env.SUPERADMIN_PHONE as string;

    if (!superAdminPhone) {
      throw new NotFoundException(
        'Dasturchiga murojat qiling .env da super adminning telefon raqami topilmadi!',
      );
    }

    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;

    if (status && status === AuthStatusEnum.ACCOUNT_DELETED)
      throw new ForbiddenException(
        `Foydalanuvchi status-ni ${AuthStatusEnum.ACCOUNT_DELETED} qilish mumkin emas.`,
      );

    if (status && userAuth.phone === superAdminPhone)
      throw new ForbiddenException(
        "Sizga super adminning status-ni o'zgartirish uchun huquq berilmagan!",
      );

    if (role && userAuth.phone === superAdminPhone)
      throw new ForbiddenException(
        "Sizga super adminning role-ni o'zgartirish uchun huquq berilmagan!",
      );

    if (role === AuthRoleEnum.SUPERADMIN && userAuth.phone !== superAdminPhone)
      throw new ForbiddenException(
        `${AuthRoleEnum.SUPERADMIN} role-ni berish uchun siz super puper admin bo'lishingiz kerak!`,
      );

    if (status === AuthStatusEnum.DELETED && userAuth.phone !== superAdminPhone)
      throw new ForbiddenException(
        "Foydalanuvchi malumotlarini faqatgina super puper admin o'chira oladi!",
      );

    if (status === AuthStatusEnum.DELETED) {
      await this.repository.delete({ id: userAuth.id });
      user.status = AuthStatusEnum.DELETED;
      await this.userRepository.save(user);
      return user;
    }

    if (status) {
      user.status = status;
      userAuth.status = status;
    }
    if (role) {
      user.role = role;
      userAuth.role = role;
    }

    await this.userRepository.save(user);
    await this.repository.save(userAuth);
    return user;
  }
}
