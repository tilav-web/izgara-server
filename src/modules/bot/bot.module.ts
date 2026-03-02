import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/user.entity';
import { BotController } from './bot.controller';
import { BotService } from './bot.service';
import { StartCommand } from './commands/start.command';
import { ContactEvent } from './events/contact.event';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  controllers: [BotController],
  providers: [BotService, StartCommand, ContactEvent],
  exports: [BotService],
})
export class BotModule {}
