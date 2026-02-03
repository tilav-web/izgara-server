import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliverySettings } from './delivery-settings.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DeliverySettingsService {
  constructor(
    @InjectRepository(DeliverySettings)
    private readonly repository: Repository<DeliverySettings>,
  ) {}
}
