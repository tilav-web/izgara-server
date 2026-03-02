import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Bot, webhookCallback } from 'grammy';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly bot: Bot;
  public webhookCallback?: (req: Request, res: Response) => Promise<void>;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) {
      throw new Error(
        'BOT_TOKEN is not defined in your environment variables!',
      );
    }

    this.bot = new Bot(token);
    this.setupCommands();
  }

  async onModuleInit() {
    const botMode = this.configService.get<string>('BOT_MODE');

    if (botMode === 'polling') {
      console.log('Bot is starting in polling mode...');

      try {
        await this.bot.api.deleteWebhook({ drop_pending_updates: true });
        await this.bot.start();
        console.log('Bot started successfully in polling mode.');
      } catch (error) {
        console.error('Error starting bot in polling mode:', error);
        throw error;
      }
    } else if (botMode === 'webhook') {
      console.log('Bot is starting in webhook mode...');

      this.webhookCallback = webhookCallback(this.bot, 'express');

      const webhookUrl = this.configService.get<string>('WEBHOOK_URL');
      if (!webhookUrl) {
        throw new Error(
          'WEBHOOK_URL is not defined in your environment variables!',
        );
      }

      try {
        await this.bot.api.setWebhook(webhookUrl, {
          drop_pending_updates: true,
        });
        console.log(`Telegram bot webhook successfully set to: ${webhookUrl}`);
      } catch (error) {
        console.error('Error setting webhook:', error);
        throw error;
      }
    } else {
      throw new Error(
        'Invalid BOT_MODE. Please set it to "polling" or "webhook" in your .env file.',
      );
    }
  }

  private setupCommands() {
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        'Welcome to the bot! Use /help to see available commands.',
      );
    });

    // Error handling for bot
    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  getBot(): Bot {
    return this.bot;
  }

  async onModuleDestroy() {
    const botMode = this.configService.get<string>('BOT_MODE');

    if (botMode === 'polling') {
      try {
        await this.bot.stop();
        console.log('Bot stopped polling.');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
    }
  }
}
