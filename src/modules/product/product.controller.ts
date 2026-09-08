import {
  Body,
  Controller,
  Delete,
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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthStatusGuard } from '../auth/guard/status.guard';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Throttle({ default: { ttl: 60000, limit: 200 } })
  @ApiOperation({
    summary: 'Barcha faol mahsulotlar ro‘yxatini olish (mijozlar uchun)',
  })
  async findAll(@Query() dto: FindAllFilterDto) {
    return this.productService.findAll(dto);
  }

  @Get('/admin/all')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Barcha mahsulotlar ro‘yxatini olish (Admin uchun)',
  })
  async findAllForAdmin(@Query() dto: FindAllFilterDto) {
    return this.productService.findAll(dto, AuthRoleEnum.SUPERADMIN);
  }

  @Get('/admin/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'ID bo‘yicha mahsulot ma’lumotlarini olish (Admin uchun)',
  })
  @ApiParam({ name: 'id', type: String, description: 'Mahsulot ID raqami' })
  async findByIdForAdmin(@Param('id') id: string) {
    return this.productService.findById(id, AuthRoleEnum.SUPERADMIN);
  }

  @Get('/:id')
  @ApiOperation({ summary: 'ID bo‘yicha faol mahsulot ma’lumotlarini olish' })
  @ApiParam({ name: 'id', type: String, description: 'Mahsulot ID raqami' })
  async findById(@Param('id') id: string) {
    return this.productService.findById(id);
  }

  @Patch('/update/:id')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Mahsulot ma’lumotlarini va/yoki rasmini yangilash',
  })
  @ApiParam({ name: 'id', type: String, description: 'Mahsulot ID raqami' })
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.productService.update(id, { ...body, image });
  }

  @Delete('/:id/image')
  @UseGuards(AuthGuard('jwt'), AuthRoleGuard, AuthStatusGuard)
  @Roles(AuthRoleEnum.SUPERADMIN)
  @ApiBearerAuth('access_token')
  @ApiOperation({
    summary: 'Mahsulot rasmini o‘chirish',
    description:
      'Mahsulotning yuklangan rasmini serverdan o‘chiradi va bazada rasmni bo‘shatadi (faqat Superadmin)',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Mahsulot ID raqami',
  })
  @ApiResponse({
    status: 200,
    description: 'Mahsulot rasmi muvaffaqiyatli o‘chirildi',
  })
  @ApiResponse({
    status: 400,
    description: 'Mahsulot IDsi yuborilmagan',
  })
  @ApiResponse({
    status: 401,
    description: 'Avtorizatsiyadan o‘tilmagan (token yo‘q yoki yaroqsiz)',
  })
  @ApiResponse({
    status: 403,
    description: 'Ruxsat yo‘q (Faqat SUPERADMIN)',
  })
  @ApiResponse({
    status: 404,
    description: 'Mahsulot topilmadi',
  })
  async deleteImage(@Param('id') id: string) {
    return this.productService.deleteImage(id);
  }
}
