import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './schemas/order.entity';
import { OrderItem } from './schemas/order-item.entity';
import { OrderItemModifier } from './schemas/order-item-modifier.entity';
import { OrdersController } from './controllers/order.controller';
import { OrderService } from './services/order.service';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { ModifierModule } from '../modifier/modifier.module';
import { CoinSettingsModule } from '../coinSettings/coin-settings.module';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderItemModifier, User]),
    UserModule,
    ProductModule,
    ModifierModule,
    CoinSettingsModule,
  ],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
