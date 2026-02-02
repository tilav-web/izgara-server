import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { FindAllFilterDto } from './dto/find-all-filter.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRoleGuard } from '../auth/guard/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from '../auth/enums/auth-role.enum';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  async findAll(@Query() dto: FindAllFilterDto) {
    return this.productService.findAll(dto);
  }

  @Get('/:id')
  async findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access_token')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productService.update(id, { ...body, image });
  }
}
