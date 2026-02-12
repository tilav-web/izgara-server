import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
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
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { UsersFilterDto } from './dto/users-filter.dto';
import { AuthStatusGuard } from '../auth/guard/status.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/find-one/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async findByIdForAdmin(@Param('id') id: number) {
    return this.userService.findByIdForAdmin(id);
  }

  @Get('/')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  async findAll(@Query() query: UsersFilterDto) {
    return this.userService.findAll(query);
  }

  @Get('/find-me')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
  @ApiBearerAuth('access_token')
  async findMe(@Req() req: Request) {
    const auth = req.user as { id: number };
    return this.userService.findByAuthId(auth?.id);
  }

  @Patch('/update')
  @UseGuards(AuthGuard('jwt'), AuthStatusGuard)
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
