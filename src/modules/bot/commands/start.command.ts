import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bot } from 'grammy';
import { Repository } from 'typeorm';
import { Auth } from '../../auth/auth.entity';
import { AuthStatusEnum } from '../../auth/enums/status.enum';
import { TelegramStatusEnum } from '../../auth/guard/telegram-status.enum';
import { AuthRedisService } from '../../redis/auth-redis.service';

@Injectable()
export class StartCommand {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly authRedisService: AuthRedisService,
  ) {}

  register(bot: Bot) {
    bot.command('start', async (ctx) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

      if (!telegramId) {
        await ctx.reply("Telegram foydalanuvchi ma'lumoti topilmadi.");
        return;
      }

      const auth = await this.authRepository.findOne({
        where: { telegram_id: telegramId },
      });

      if (auth?.status === AuthStatusEnum.BLOCK) {
        await ctx.reply(
          "Siz blocklangansiz. Iltimos, admin bilan bog'laning.",
          {
            reply_markup: { remove_keyboard: true },
          },
        );
        return;
      }

      if (auth?.phone) {
        if (auth.telegram_status !== TelegramStatusEnum.ACTIVE) {
          auth.telegram_status = TelegramStatusEnum.ACTIVE;
          const updatedAuth = await this.authRepository.save(auth);
          await this.authRedisService.setAuthDetails({ auth: updatedAuth });
        }

        await ctx.reply(
          "Bot qayta ishga tushdi. Siz allaqachon ro'yxatdan o'tgansiz.",
          {
            reply_markup: { remove_keyboard: true },
          },
        );
        return;
      }

      await ctx.reply(
        "Assalomu alaykum! Izgara botiga xush kelibsiz. Ro'hatdan o'tish uchun telefon raqamingizni yuboring.",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: 'Telefon raqamni yuborish',
                  request_contact: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        },
      );
    });
  }
}
