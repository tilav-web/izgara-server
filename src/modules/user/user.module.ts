import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FileModule } from '../file/file.module';
import { Auth } from '../auth/auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Auth]), FileModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
