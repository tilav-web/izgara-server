import { Module } from '@nestjs/common';
import { DeliverySettings } from './delivery-settings.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([DeliverySettings])],
  controllers: [],
  providers: [],
  exports: [],
})
export class DeliverySettingsModule {}
