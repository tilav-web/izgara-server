import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModifierGroup } from './modifier-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModifierGroup])],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModifierGroupModule {}
