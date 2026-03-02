import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Bot } from 'grammy';
import { Repository } from 'typeorm';
import { Auth } from '../../auth/auth.entity';
import { User } from '../../user/user.entity';
import { AuthStatusEnum } from '../../auth/enums/status.enum';
import { regexPhone } from '../../auth/utils/regex-phone';
import { AuthRedisService } from '../../redis/auth-redis.service';
import { UserRedisService } from '../../redis/user-redis.service';

@Injectable()
export class ContactEvent {
  constructor(
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly authRedisService: AuthRedisService,
    private readonly userRedisService: UserRedisService,
  ) {}

  register(bot: Bot) {
    bot.on('message', async (ctx, next) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;

      if (!telegramId) {
        return next();
      }

      const auth = await this.authRepository.findOne({
        where: { telegram_id: telegramId },
      });

      if (auth?.status === AuthStatusEnum.BLOCK) {
        await ctx.reply("Siz blocklangansiz. Iltimos, admin bilan bog'laning.");
        return;
      }

      if (!auth && !ctx.message.contact) {
        await ctx.reply(
          "Ro'yxatdan o'tish uchun telefon raqamingizni yuboring.",
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
        return;
      }

      return next();
    });

    bot.on('message:contact', async (ctx) => {
      const telegramId = ctx.from?.id ? String(ctx.from.id) : null;
      if (!telegramId) {
        await ctx.reply("Telegram foydalanuvchi ma'lumoti topilmadi.");
        return;
      }

      const contact = ctx.message.contact;
      if (contact.user_id && String(contact.user_id) !== telegramId) {
        await ctx.reply(
          "Faqat o'zingizning telefon raqamingizni yuborishingiz mumkin.",
        );
        return;
      }

      const { test, cleanPhone } = regexPhone(contact.phone_number);
      if (!test) {
        await ctx.reply(
          "Telefon raqami O'zbekiston formatida emas. Qaytadan yuboring.",
        );
        return;
      }

      const authByTelegram = await this.authRepository.findOne({
        where: { telegram_id: telegramId },
      });

      if (authByTelegram?.status === AuthStatusEnum.BLOCK) {
        await ctx.reply("Siz blocklangansiz. Iltimos, admin bilan bog'laning.");
        return;
      }

      if (authByTelegram && authByTelegram.phone === cleanPhone) {
        await ctx.reply('Telefon raqamingiz allaqachon tasdiqlangan.');
        return;
      }

      if (authByTelegram && authByTelegram.phone !== cleanPhone) {
        await ctx.reply(
          "Bu Telegram akkaunt boshqa telefon raqamga bog'langan. Iltimos, admin bilan bog'laning.",
        );
        return;
      }

      const authByPhone = await this.authRepository.findOne({
        where: { phone: cleanPhone },
      });

      if (authByPhone?.status === AuthStatusEnum.BLOCK) {
        await ctx.reply("Siz blocklangansiz. Iltimos, admin bilan bog'laning.");
        return;
      }

      if (authByPhone) {
        authByPhone.telegram_id = telegramId;
        const updatedAuth = await this.authRepository.save(authByPhone);
        const user = await this.userRepository.findOne({
          where: { id: updatedAuth.user_id },
        });

        await this.authRedisService.setAuthDetails({ auth: updatedAuth });
        if (user) {
          await this.userRedisService.setUserDetails({
            user,
            auth_id: updatedAuth.id,
          });
        }

        await ctx.reply("Muvaffaqiyatli bog'landi. Siz tizimga kirdingiz.", {
          reply_markup: { remove_keyboard: true },
        });
        return;
      }

      const createdAuth = await this.authRepository.manager.transaction(
        async (manager) => {
          const user = manager.create(User, { phone: cleanPhone });
          const savedUser = await manager.save(User, user);

          const auth = manager.create(Auth, {
            phone: cleanPhone,
            telegram_id: telegramId,
            user: savedUser,
          });
          const savedAuth = await manager.save(Auth, auth);

          return { savedUser, savedAuth };
        },
      );

      await this.authRedisService.setAuthDetails({
        auth: createdAuth.savedAuth,
      });
      await this.userRedisService.setUserDetails({
        user: createdAuth.savedUser,
        auth_id: createdAuth.savedAuth.id,
      });

      await ctx.reply("Ro'yxatdan o'tish muvaffaqiyatli yakunlandi.", {
        reply_markup: { remove_keyboard: true },
      });
    });
  }
}
