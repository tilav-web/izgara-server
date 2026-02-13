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
import { LocationModule } from '../location/location.module';
import { DeliverySettingsModule } from '../deliverySettings/delivery-settings.module';
import { JobsModule } from '../jobs/jobs.module';
import { PaymentTransaction } from '../payment/payment-transaction.entity';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderItemModifier,
      User,
      PaymentTransaction,
    ]),
    UserModule,
    ProductModule,
    ModifierModule,
    CoinSettingsModule,
    LocationModule,
    DeliverySettingsModule,
    JobsModule,
    SocketModule,
  ],
  controllers: [OrdersController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
