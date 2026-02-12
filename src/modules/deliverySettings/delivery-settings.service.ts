import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliverySettings } from './delivery-settings.entity';
import { Repository } from 'typeorm';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { DeliverySettingsRedisService } from '../redis/delivery-seetings-redis.service';

@Injectable()
export class DeliverySettingsService {
  constructor(
    @InjectRepository(DeliverySettings)
    private readonly repository: Repository<DeliverySettings>,
    private readonly deliverySettingsRedisService: DeliverySettingsRedisService,
  ) {}

  async findSettings(): Promise<DeliverySettings> {
    const cacheSettings =
      await this.deliverySettingsRedisService.getDeliverySettings();
    if (cacheSettings) return cacheSettings;

    let settings = await this.repository.findOne({ where: {} });

    if (!settings) {
      settings = this.repository.create({
        delivery_price: 10000,
        free_delivery_threshold: 70000,
      });
      await this.repository.save(settings);
    }

    await this.deliverySettingsRedisService.setDeliverySettings({
      deliverySettings: settings,
    });
    return settings;
  }

  async update(
    updateDto: UpdateDeliverySettingsDto,
  ): Promise<DeliverySettings> {
    let settings = await this.repository.findOne({ where: {} });

    if (!settings) {
      settings = this.repository.create(updateDto);
    } else {
      this.repository.merge(settings, updateDto);
    }

    await this.deliverySettingsRedisService.setDeliverySettings({
      deliverySettings: settings,
    });

    return this.repository.save(settings);
  }
}
