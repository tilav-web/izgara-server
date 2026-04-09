import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { SeedModule } from './seed/seed.module';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { ModifierModule } from './modules/modifier/modifier.module';
import { ModifierGroupModule } from './modules/modifierGroup/modifier-group.module';
import { AliPosModule } from './modules/alipos/alipos.module';
import { IikoModule } from './modules/iiko/iiko.module';
import { FileModule } from './modules/file/file.module';
import { LocationModule } from './modules/location/location.module';
import { DeliverySettingsModule } from './modules/deliverySettings/delivery-settings.module';
import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './modules/jobs/jobs.module';
import { OrderModule } from './modules/order/order.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PaymentModule } from './modules/payment/payment.module';
import { APP_GUARD } from '@nestjs/core';
import { BotModule } from './modules/bot/bot.module';
import { SmsModule } from './modules/sms/sms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 30,
      },
    ]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          type: 'postgres',
          host: config.get('DB_HOST'),
          port: config.get('DB_PORT'),
          username: config.get('DB_USERNAME'),
          password: config.get('DB_PASSWORD'),
          database: config.get('DB_NAME'),
          autoLoadEntities: true,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV === 'development',
          logging: process.env.NODE_ENV === 'development',
        };
      },
    }),
    BotModule,
    RedisModule,
    SeedModule,
    AliPosModule,
    IikoModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    ModifierModule,
    ModifierGroupModule,
    FileModule,
    LocationModule,
    DeliverySettingsModule,
    JobsModule,
    OrderModule,
    PaymentModule,
    SmsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
