import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Auth } from "./auth.entity";
import { Repository } from "typeorm";
import { otpCodeGenerate } from "./utils/otp-code.generate";
import { regexPhone } from "./utils/regex-phone";
import { RedisOtpService } from "../redis/redis-otp.service";
import { RedisAuthService } from "../redis/redis-auth.service";
import { JwtService } from "@nestjs/jwt";
import { AuthRoleEnum } from "./enums/auth-role.enum";
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Auth) private readonly repository: Repository<Auth>,
        private readonly redisOtpService: RedisOtpService,
        private readonly redisAuthService: RedisAuthService,
        private readonly jwtService: JwtService
    ) { }

    async findById(id: number): Promise<Auth | null> {
        const authCache = await this.redisAuthService.getAuthDetails({ id })
        if (authCache) {
            return authCache
        }
        const authNotFoundCache = await this.redisAuthService.getNotFoundAuth({ id })
        if (authNotFoundCache) {
            return null
        }
        const auth = await this.repository.findOne({ where: { id } })
        if (!auth) {
            await this.redisAuthService.setNotFoundAuth({ id })
            return null
        }

        this.redisAuthService.setAuthDetails({ auth })
        return auth
    }

    async findByPhone(phone: string): Promise<Auth | null> {
        const { test, cleanPhone } = regexPhone(phone)

        if (!test) {
            throw new BadRequestException("Telefon raqami O‘zbekiston formatida emas");
        }

        const authCache = await this.redisAuthService.getAuthDetails({ phone: cleanPhone })
        if (authCache) {
            return authCache
        }
        const authNotFoundCache = await this.redisAuthService.getNotFoundAuth({ phone: cleanPhone })
        if (authNotFoundCache) {
            return null
        }
        const auth = await this.repository.findOne({ where: { phone: cleanPhone } })
        if (!auth) {
            await this.redisAuthService.setNotFoundAuth({ phone: cleanPhone })
            return null
        }

        this.redisAuthService.setAuthDetails({ auth })
        return auth
    }

    async auth({ phone, password }: { phone: string; password?: string }) {
        const { test, cleanPhone } = regexPhone(phone)

        if (!test) {
            throw new BadRequestException("Telefon raqami O‘zbekiston formatida emas");
        }
        let auth = await this.findByPhone(cleanPhone)

        if (!auth) {
            auth = this.repository.create({ phone: cleanPhone });
            auth = await this.repository.save(auth);
        }

        if (auth.role === AuthRoleEnum.SUPERADMIN) {
            if (!password || !auth.password) {
                throw new BadRequestException('Parol kiritilmagan. Admin sifatida kirish uchun parolingizni kiriting yoki supportga murojaat qiling');
            }

            const isMatch = await bcrypt.compare(password, auth.password);

            if (!isMatch) throw new BadRequestException('Parolda xatolik bor!');

            const access_token = this.jwtService.sign({
                id: auth.id,
                role: auth.role
            }, {
                expiresIn: "15m"
            })

            const refresh_token = this.jwtService.sign({
                id: auth.id,
                role: auth.role
            }, {
                expiresIn: "7d"
            }
            );
            return {
                access_token, refresh_token, auth: {
                    ...auth,
                    password: null
                }
            }
        }

        const hasCode = await this.redisOtpService.getOtpByPhone(cleanPhone);

        if (hasCode) {
            throw new ConflictException(
                "Oldingi OTP hali amal qiladi. Iltimos, bir necha soniya kuting yoki eski kodni ishlating."
            );
        }

        const code = otpCodeGenerate()

        await this.redisOtpService.setOtpByPhone({ phone: auth.phone, code })
        return { message: "Telefon raqamingizga 4 xonali kod yubirdik amal qilish muddati 1 daqiqa!", code } // o'chirish kerak keyinchalik kodni
    }

    async verifyOtp({ phone, code }: { phone: string; code: number }) {
        const { test, cleanPhone } = regexPhone(phone)

        if (!test) {
            throw new BadRequestException("Telefon raqami O‘zbekiston formatida emas");
        }

        const verifyOtpResult = await this.redisOtpService.verifyOtpByPhone({ phone: cleanPhone, code })

        if (verifyOtpResult === 0) {
            throw new BadRequestException('Kodni tekshiring va qayta kiriting')
        }

        if (verifyOtpResult === 2) {
            throw new BadRequestException('Kodning amal qilish muddati tugadi!')
        }

        const auth = await this.findByPhone(phone)

        if (!auth) throw new NotFoundException('Foydalanuvchi topilmadi!')

        const access_token = this.jwtService.sign({
            id: auth.id,
            role: auth.role
        }, {
            expiresIn: "15m"
        })

        const refresh_token = this.jwtService.sign({
            id: auth.id,
            role: auth.role
        }, {
            expiresIn: "7d"
        }
        );

        return { auth, access_token, refresh_token }
    }

}