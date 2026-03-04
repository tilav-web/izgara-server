import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModifierGroup } from './modifier-group.entity';
import { ModifierGroupController } from './modifier-group.controller';
import { ModifierGroupService } from './modifier-group.service';
import { Product } from '../product/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModifierGroup, Product])],
  controllers: [ModifierGroupController],
  providers: [ModifierGroupService],
  exports: [ModifierGroupService],
})
export class ModifierGroupModule {}
