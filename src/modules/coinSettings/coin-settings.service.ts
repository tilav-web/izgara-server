import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CoinSettings } from './coin-settings.entity';
import { Repository } from 'typeorm';
import { CoinSettingsRedisService } from '../redis/coin-settings-redis.service';
import { UpdateCoinSettingsDto } from './dto/update-coin-settings.dto';

@Injectable()
export class CoinSettingsService {
  constructor(
    @InjectRepository(CoinSettings)
    private readonly repository: Repository<CoinSettings>,
    private readonly coinSettingRedisService: CoinSettingsRedisService,
  ) {}

  async findCoinSettings(): Promise<CoinSettings> {
    const coinSettingsCache =
      await this.coinSettingRedisService.getCoinSettings();
    if (coinSettingsCache) {
      return coinSettingsCache;
    }

    let settings = await this.repository.findOne({ where: {} });

    if (!settings) {
      settings = this.repository.create({
        value_per_coin: Number(process.env.VALUE_PER_COIN),
        spend_amount_for_one_coin: Number(
          process.env.SPEND_AMOUNT_FOR_ONE_COIN,
        ),
        min_spend_limit: Number(process.env.MIN_SPEND_LIMIT),
        max_coins_per_order: Number(process.env.MAX_COINS_PER_ORDER),
      });
      await this.repository.save(settings);
    }

    await this.coinSettingRedisService.setCoinSettings({
      coinSettings: settings,
    });
    return settings;
  }

  async updateCoinSettings(body: UpdateCoinSettingsDto): Promise<CoinSettings> {
    let settings = await this.repository.findOne({ where: {} });

    if (!settings) {
      settings = this.repository.create(body);
    } else {
      this.repository.merge(settings, body);
    }

    const updatedSettings = await this.repository.save(settings);

    await this.coinSettingRedisService.setCoinSettings({
      coinSettings: updatedSettings,
    });

    return updatedSettings;
  }
}
