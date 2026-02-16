import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from '../order/order.module';
import { Order } from '../order/schemas/order.entity';
import { ClickController } from './controllers/click.controller';
import { PaymentTransactionController } from './controllers/payment-transaction.controller';
import { PaymeController } from './controllers/payme.controller';
import { PaymentTransaction } from './payment-transaction.entity';
import { ClickService } from './services/click.service';
import { PaymeService } from './services/payme.service';
import { PaymentTransactionService } from './services/payment-transaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, Order]), OrderModule],
  controllers: [ClickController, PaymeController, PaymentTransactionController],
  providers: [ClickService, PaymeService, PaymentTransactionService],
  exports: [ClickService, PaymeService, PaymentTransactionService],
})
export class PaymentModule {}
