import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Auth } from '../modules/auth/auth.entity';
import { AuthRoleEnum } from '../modules/auth/enums/auth-role.enum';
import { regexPhone } from '../modules/auth/utils/regex-phone';
import { User } from '../modules/user/user.entity';
import { CoinSettingsService } from '../modules/coinSettings/coin-settings.service';

@Injectable()
export class SeedService {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(Auth) private readonly authRepository: Repository<Auth>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly configService: ConfigService,
        private readonly coinSettingsService: CoinSettingsService,
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

        let user = this.userRepository.create({ first_name, last_name, phone: cleanPhone, role: AuthRoleEnum.SUPERADMIN })
        user = await this.userRepository.save(user)
        await this.authRepository.save({
            phone: cleanPhone,
            password,
            role: AuthRoleEnum.SUPERADMIN,
            user
        });

        this.logger.log('Superadmin created successfully!');
    }

    async createDeafultCoinService() {
        try {
            const coinSettings = await this.coinSettingsService.findCoinSettings()
            this.logger.log(coinSettings);

            if (coinSettings) {
                console.log('Eski coin sozlamalari saqlanib qolgan!');
                return
            }
            const max_coins_per_order = parseFloat(this.configService.get<string>('MAX_COINS_PER_ORDER') ?? '0') ?? undefined;
            const min_spend_limit = parseFloat(this.configService.get<string>('MIN_SPEND_LIMIT') ?? '0') ?? undefined;
            const spend_amount_for_one_coin = parseFloat(this.configService.get<string>('SPEND_AMOUNT_FOR_ONE_COIN') ?? '0') ?? undefined;
            const value_per_coin = parseFloat(this.configService.get<string>('VALUE_PER_COIN') ?? '0') ?? undefined;
            await this.coinSettingsService.createCoinSettings({ max_coins_per_order, min_spend_limit, spend_amount_for_one_coin, value_per_coin })
            this.logger.log("coin sozlamalari yaratildi");

        } catch (error) {
            console.error(error);

            this.logger.log("Coin sozlamalarini yaratishda xatolik!");
        }
    }
}