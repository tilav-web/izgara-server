import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryModule } from '../category/category.module';
import { AuthModule } from '../auth/auth.module';
import { Product } from '../product/product.entity';
import { Modifier } from '../modifier/modifier.entity';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';
import { Order } from '../order/schemas/order.entity';
import { IikoController } from './controllers/iiko.controller';
import { IikoBaseService } from './services/base.service';
import { IikoService } from './services/iiko.service';
import { IIKO_API_BASE_URL } from './utils/constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ModifierGroup, Modifier, Order]),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get<string>('IIKO_BASE_URL') || IIKO_API_BASE_URL,
        timeout: 10000,
      }),
    }),
    CategoryModule,
    AuthModule,
  ],
  controllers: [IikoController],
  providers: [IikoBaseService, IikoService],
  exports: [IikoBaseService, IikoService],
})
export class IikoModule {}
