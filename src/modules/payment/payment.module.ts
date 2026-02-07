import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentTransaction } from './payment-transaction.entity';
import { ClickController } from './controllers/click.controller';
import { ClickService } from './services/click.service';
import { Order } from '../order/schemas/order.entity';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Order]), OrderModule],
  controllers: [ClickController],
  providers: [ClickService],
  exports: [ClickService],
})
export class PaymentModule {}
