import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module';
import { Order } from '../order/schemas/order.entity';
import { ClickController } from './controllers/click.controller';
import { PaymeController } from './controllers/payme.controller';
import { PaymentTransaction } from './payment-transaction.entity';
import { ClickService } from './services/click.service';
import { PaymeService } from './services/payme.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Order]), OrderModule],
  controllers: [ClickController, PaymeController],
  providers: [ClickService, PaymeService],
  exports: [ClickService, PaymeService],
})
export class PaymentModule {}
