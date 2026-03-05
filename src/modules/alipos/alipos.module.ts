import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AliPosBaseService } from './services/base.service';
import { CategoryModule } from '../category/category.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/product.entity';
import { AliPosController } from './controllers/alipos.controller';
import { AliPosService } from './services/alipos.service';
import { AuthModule } from '../auth/auth.module';
import { Modifier } from '../modifier/modifier.entity';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';
import { OrderModule } from '../order/order.module';
import { Order } from '../order/schemas/order.entity';
import { DeliverySettingsModule } from '../deliverySettings/delivery-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ModifierGroup, Modifier, Order]),
    HttpModule.register({
      baseURL: 'https://web.alipos.uz',
      timeout: 5000,
    }),
    CategoryModule,
    AuthModule,
    OrderModule,
    DeliverySettingsModule,
  ],
  controllers: [AliPosController],
  providers: [AliPosBaseService, AliPosService],
  exports: [AliPosBaseService, AliPosService],
})
export class AliPosModule {}
