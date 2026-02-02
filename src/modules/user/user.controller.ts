import {
  Body,
  Controller,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { type Request } from 'express';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/find-me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access_token')
  async findMe(@Req() req: Request) {
    const auth = req.user as { id: number };
    return this.userService.findByAuthId(auth?.id);
  }

  @Patch('/update')
  @UseGuards(AuthGuard('jwt'))
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access_token')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Req() req: Request,
    @Body() body: UpdateUserDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    const auth = req.user as { id: number };
    return this.userService.update(auth.id, { ...body, image });
  }
}
