import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

@Injectable()
export class StartCommand {
  constructor() {}

  register(bot: Bot) {
    bot.command('start', async (ctx) => {
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
