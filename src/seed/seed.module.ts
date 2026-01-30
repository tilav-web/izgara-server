import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Auth } from '../modules/auth/auth.entity';
import { User } from '../modules/user/user.entity';
import { CoinSettingsModule } from '../modules/coinSettings/coin-settings.module';

@Module({
  imports: [TypeOrmModule.forFeature([Auth, User]), CoinSettingsModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule { }