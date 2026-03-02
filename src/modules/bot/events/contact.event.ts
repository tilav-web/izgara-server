import { Injectable } from '@nestjs/common';
import { Bot } from 'grammy';

@Injectable()
export class ContactEvent {
  register(bot: Bot) {
    bot.on('message:contact', async (ctx) => {
      const phone = ctx.message.contact.phone_number;
      await ctx.reply(`Siz yuborgan telefon raqamingiz: ${phone}`);
    });
  }
}
