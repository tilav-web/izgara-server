import { Module } from '@nestjs/common';
import { DeliverySettings } from './delivery-settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliverySettingsController } from './delivery-settings.controller';
import { DeliverySettingsService } from './delivery-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeliverySettings])],
  controllers: [DeliverySettingsController],
  providers: [DeliverySettingsService],
  exports: [DeliverySettingsService],
})
export class DeliverySettingsModule {}
