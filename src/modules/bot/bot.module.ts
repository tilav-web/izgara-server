import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { Auth } from '../auth/auth.entity';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { StartCommand } from './commands/start.command';
import { ContactEvent } from './events/contact.event';
import { OrderBotService } from './services/order-bot.service';
import { Order } from '../order/schemas/order.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User, Auth, Order])],
  controllers: [BotController],
  providers: [BotService, StartCommand, ContactEvent, OrderBotService],
  exports: [BotService, OrderBotService],
})
export class BotModule {}
