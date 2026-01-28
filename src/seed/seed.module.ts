import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedSuperAdminService } from './seed.service';
import { Auth } from '../modules/auth/auth.entity';
import { User } from '../modules/user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auth, User])],
  providers: [SeedSuperAdminService],
  exports: [SeedSuperAdminService],
})
export class SeedModule { }