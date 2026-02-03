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
        value_per_coin: 100,
        spend_amount_for_one_coin: 10000,
        min_spend_limit: 10000,
        max_coins_per_order: 1000,
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
