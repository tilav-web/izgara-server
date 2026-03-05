import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modifier } from './modifier.entity';
import { ModifierController } from './modifier.controller';
import { ModifierService } from './modifier.service';
import { ModifierGroup } from '../modifierGroup/modifier-group.entity';
import { FileModule } from '../file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([Modifier, ModifierGroup]), FileModule],
  controllers: [ModifierController],
  providers: [ModifierService],
  exports: [ModifierService],
})
export class ModifierModule {}
