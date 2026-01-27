import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedSuperAdminService } from './seed.service';
import { Auth } from '../modules/auth/auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auth])],
  providers: [SeedSuperAdminService],
  exports: [SeedSuperAdminService],
})
export class SeedModule {}