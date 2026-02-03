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
import { FileModule } from './modules/file/file.module';
import { LocationModule } from './modules/location/location.module';
import { DeliverySettingsModule } from './modules/deliverySettings/delivery-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
    RedisModule,
    SeedModule,
    AliPosModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    ModifierModule,
    ModifierGroupModule,
    FileModule,
    LocationModule,
    DeliverySettingsModule,
  ],
})
export class AppModule {}
