import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modifier } from './modifier.entity';
import { ModifierController } from './modifier.controller';
import { ModifierService } from './modifier.service';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Modifier, ModifierGroup])],
  controllers: [ModifierController],
  providers: [ModifierService],
  exports: [ModifierService],
})
export class ModifierModule {}
