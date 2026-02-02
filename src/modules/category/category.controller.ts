import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll();
  }

  @Patch('/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access_token')
  @UseInterceptors(FileInterceptor('image'))
  async updateCategory(
    @Param('id') id: string,
    @Body() { name, sort_order }: UpdateCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    console.log(id);

    return this.categoryService.updateCategory({ id, name, sort_order, image });
  }
}
