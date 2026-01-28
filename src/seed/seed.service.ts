import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Auth } from '../modules/auth/auth.entity';
import { AuthRoleEnum } from '../modules/auth/enums/auth-role.enum';
import { regexPhone } from '../modules/auth/utils/regex-phone';
import { User } from '../modules/user/user.entity';

@Injectable()
export class SeedSuperAdminService {
    private readonly logger = new Logger(SeedSuperAdminService.name);

    constructor(
        @InjectRepository(Auth) private readonly authRepository: Repository<Auth>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService,
    ) { }

    async createSuperAdminNotExists() {
        const exists = await this.authRepository.findOne({
            where: { role: AuthRoleEnum.SUPERADMIN },
        });

        if (exists) {
            this.logger.log('Superadmin already exists. Skipping seed.');
            return;
        }

        const phone = this.configService.get<string>('SUPERADMIN_PHONE');
        const rawPassword = this.configService.get<string>('SUPERADMIN_PASSWORD');
        const first_name = this.configService.get<string>('SUPERADMIN_FIRST_NAME');
        const last_name = this.configService.get<string>('SUPERADMIN_LAST_NAME');


        if (!phone || !rawPassword) {
            const msg = `
      ❌ SUPERADMIN yaratib bo‘lmadi!
      .env faylda quyidagi maydonlar bo‘lishi shart:
      SUPERADMIN_NAME=
      SUPERADMIN_PHONE=
      SUPERADMIN_PASSWORD=
      `;
            this.logger.error(msg);

            throw new Error(
                'Superadmin creation failed: missing required environment variables.',
            );
        }

        const { test, cleanPhone } = regexPhone(phone)

        if (!test) {
            throw new BadRequestException("Telefon raqami O‘zbekiston formatida emas");
        }

        const password = await bcrypt.hash(rawPassword, 10);

        let user = this.userRepository.create({ first_name, last_name, phone: cleanPhone })
        user = await this.userRepository.save(user)
        await this.authRepository.save({
            phone: cleanPhone,
            password,
            role: AuthRoleEnum.SUPERADMIN,
            user
        });

        this.logger.log('Superadmin created successfully!');
    }
}