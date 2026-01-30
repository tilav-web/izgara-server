import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CoinSettings } from "./coin-settings.entity";
import { Repository } from "typeorm";
import { CoinSettingsRedisService } from "../redis/coin-settings-redis.service";

@Injectable()
export class CoinSettingsService {
    constructor(@InjectRepository(CoinSettings) private readonly repository: Repository<CoinSettings>, private readonly coinSettingRedisService: CoinSettingsRedisService) { }

    async findCoinSettings() {
        const coinSettingsCache = await this.coinSettingRedisService.getCoinSettings()
        if (coinSettingsCache) return coinSettingsCache

        const coinSettings = await this.repository.findOne({
            where: {},
            order: {
                created_at: 'DESC',
            },
        });
        if (coinSettings) {
            await this.coinSettingRedisService.setCoinSettings({ coinSettings })
        }
        return coinSettings
    }

    async createCoinSettings({ value_per_coin = 100, spend_amount_for_one_coin = 10000, min_spend_limit = 10000, max_coins_per_order = 1000 }: { value_per_coin?: number; spend_amount_for_one_coin?: number; min_spend_limit?: number; max_coins_per_order?: number }) {
        return this.repository.save({ value_per_coin, spend_amount_for_one_coin, min_spend_limit, max_coins_per_order })
    }
}