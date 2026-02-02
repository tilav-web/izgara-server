import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Auth } from '../modules/auth/auth.entity';
import { User } from '../modules/user/user.entity';
import { CoinSettings } from '../modules/coinSettings/coin-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Auth, User, CoinSettings])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
